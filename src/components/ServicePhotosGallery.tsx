import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Camera,
  Search,
  Download,
  Calendar,
  Users,
  HardHat,
  MapPin,
  Clock,
  ChevronLeft,
  ChevronRight,
  X,
  FileText,
  Printer,
  FileDown,
  Layers,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  FolderArchive,
  RefreshCw,
  Eye,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { ServicePhotoItem, DailyLog, DailyLogPhoto } from '../types';
import { downloadSinglePhoto, downloadPhotosZip } from '../services/photoZipExport';
import { generatePhotoReportPdf } from '../services/photoReportExport';
import { recordServicePhotosAudit } from '../services/api';

interface ServicePhotosGalleryProps {
  onNavigateTab?: (tab: string) => void;
}

type ViewMode = 'BY_DATE' | 'BY_TEAM' | 'GRID';

export interface TeamInDateGroup {
  teamId: string;
  teamName: string;
  leaderName: string;
  worksiteName: string;
  city: string;
  photos: ServicePhotoItem[];
  servicesMap: Record<string, ServicePhotoItem[]>;
}

export interface DateGroupItem {
  date: string;
  totalCount: number;
  teamsMap: Record<string, TeamInDateGroup>;
}

export interface DateInTeamGroup {
  date: string;
  worksiteName: string;
  city: string;
  photos: ServicePhotoItem[];
  servicesMap: Record<string, ServicePhotoItem[]>;
}

export interface TeamGroupItem {
  teamId: string;
  teamName: string;
  leaderName: string;
  totalPhotosCount: number;
  datesMap: Record<string, DateInTeamGroup>;
}

export const ServicePhotosGallery: React.FC<ServicePhotosGalleryProps> = ({ onNavigateTab }) => {
  const { currentUser, isAdmin, isGestor, isTemporarilyAuthorized } = useAuth();
  const { dailyLogs = [], worksites = [] } = useData();

  const hasAccess = isAdmin || isGestor || isTemporarilyAuthorized;

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('BY_DATE');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>('TODAS');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('TODAS');
  const [selectedLeaderName, setSelectedLeaderName] = useState<string>('TODOS');
  const [selectedWorksiteId, setSelectedWorksiteId] = useState<string>('TODAS');
  const [selectedService, setSelectedService] = useState<string>('TODOS');
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  // Expanded accordion sections for By-Date and By-Team views
  const [expandedDateTeams, setExpandedDateTeams] = useState<Record<string, boolean>>({});
  const [expandedTeamDates, setExpandedTeamDates] = useState<Record<string, boolean>>({});

  // Lightbox Modal State
  const [activePhotoModal, setActivePhotoModal] = useState<ServicePhotoItem | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number>(0);

  // ZIP Download progress state
  const [zipProgress, setZipProgress] = useState<{
    active: boolean;
    title: string;
    percent: number;
    current: number;
    total: number;
  }>({ active: false, title: '', percent: 0, current: 0, total: 0 });

  // Report Modal state
  const [reportModalOpen, setReportModalOpen] = useState(false);

  // Pagination for Grid mode
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 18;

  // 1. Extract and index all photos dynamically from dailyLogs (preserving 100% existing structure)
  const allServicePhotos: ServicePhotoItem[] = useMemo(() => {
    const list: ServicePhotoItem[] = [];

    (dailyLogs || []).forEach((log: DailyLog) => {
      if (!log || !log.photos || log.photos.length === 0) return;

      const worksiteObj = (worksites || []).find((w) => w.id === log.worksiteId);

      log.photos.forEach((photo: DailyLogPhoto, index: number) => {
        if (!photo || !photo.url) return;

        // Determine specific service or distribute across log services
        const assignedService =
          photo.service ||
          (log.services && log.services.length > 0
            ? log.services[index % log.services.length]
            : 'Sinalização e Obras Viárias');

        // Extract or format timestamp & time
        let timeFormatted = '';
        if (photo.timestamp) {
          try {
            const dt = new Date(photo.timestamp);
            if (!isNaN(dt.getTime())) {
              timeFormatted = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            }
          } catch {}
        }
        if (!timeFormatted && log.workHours?.start) {
          timeFormatted = log.workHours.start;
        }

        const lat =
          photo.latitude ||
          worksiteObj?.latitude ||
          (log.city === 'Araucária' ? -25.5902 : log.city === 'São Paulo' ? -23.5505 : -25.4381);
        const lng =
          photo.longitude ||
          worksiteObj?.longitude ||
          (log.city === 'Araucária' ? -49.3789 : log.city === 'São Paulo' ? -46.6333 : -49.2683);

        list.push({
          id: photo.id || `photo-${log.id}-${index}`,
          url: photo.url,
          caption: photo.caption || `Registro de ${assignedService}`,
          timestamp: photo.timestamp || log.createdAt || new Date().toISOString(),
          timeFormatted: timeFormatted || '08:00',
          date: log.date || '2026-08-20',
          teamId: log.teamId || 'team-default',
          teamName: log.teamName || 'Equipe Operacional',
          leaderId: log.leaderId || '',
          leaderName: log.leaderName || 'Encarregado',
          leaderPhone: log.leaderPhone || '(41) 99988-1122',
          worksiteId: log.worksiteId,
          worksiteName: log.worksiteName || 'Obra Geral',
          worksiteLocationDetail: log.worksiteLocationDetail,
          city: log.city || 'Curitiba',
          state: log.state || 'PR',
          service: assignedService,
          dailyLogId: log.id,
          dailyLogStatus: log.status,
          latitude: lat,
          longitude: lng,
        });
      });
    });

    // Sort: most recent date first, then chronologically by timestamp
    list.sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    return list;
  }, [dailyLogs, worksites]);

  // Log initial consultation audit on mount
  useEffect(() => {
    if (currentUser && hasAccess) {
      recordServicePhotosAudit({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'CONSULTA',
        details: 'Visualizou a Galeria Geral de Fotos dos Serviços',
      });
    }
  }, [currentUser, hasAccess]);

  // Unique filter option lists
  const availableDates = useMemo(() => {
    const dates = Array.from(new Set(allServicePhotos.map((p) => p.date))).filter(Boolean);
    return dates.sort((a, b) => b.localeCompare(a));
  }, [allServicePhotos]);

  const availableTeams = useMemo(() => {
    const map = new Map<string, string>();
    allServicePhotos.forEach((p) => {
      if (p.teamId && p.teamName) map.set(p.teamId, p.teamName);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [allServicePhotos]);

  const availableLeaders = useMemo(() => {
    const leaders = Array.from(new Set(allServicePhotos.map((p) => p.leaderName))).filter(Boolean);
    return leaders.sort();
  }, [allServicePhotos]);

  const availableWorksites = useMemo(() => {
    const map = new Map<string, string>();
    allServicePhotos.forEach((p) => {
      if (p.worksiteName) map.set(p.worksiteId || p.worksiteName, p.worksiteName);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [allServicePhotos]);

  const availableServices = useMemo(() => {
    const services = Array.from(new Set(allServicePhotos.map((p) => p.service))).filter(Boolean);
    return services.sort();
  }, [allServicePhotos]);

  // 2. Filtered photos based on all active filters
  const filteredPhotos = useMemo(() => {
    return allServicePhotos.filter((item) => {
      // Date filter
      if (selectedDate !== 'TODAS' && item.date !== selectedDate) return false;
      if (startDate && item.date < startDate) return false;
      if (endDate && item.date > endDate) return false;

      // Team filter
      if (selectedTeamId !== 'TODAS' && item.teamId !== selectedTeamId) return false;

      // Leader filter
      if (selectedLeaderName !== 'TODOS' && item.leaderName !== selectedLeaderName) return false;

      // Worksite filter
      if (selectedWorksiteId !== 'TODAS') {
        if (item.worksiteId !== selectedWorksiteId && item.worksiteName !== selectedWorksiteId) {
          return false;
        }
      }

      // Service filter
      if (selectedService !== 'TODOS' && item.service !== selectedService) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match =
          item.teamName.toLowerCase().includes(q) ||
          item.leaderName.toLowerCase().includes(q) ||
          item.worksiteName.toLowerCase().includes(q) ||
          item.service.toLowerCase().includes(q) ||
          item.city.toLowerCase().includes(q) ||
          (item.caption && item.caption.toLowerCase().includes(q));
        if (!match) return false;
      }

      return true;
    });
  }, [
    allServicePhotos,
    selectedDate,
    startDate,
    endDate,
    selectedTeamId,
    selectedLeaderName,
    selectedWorksiteId,
    selectedService,
    searchQuery,
  ]);

  // Grouped by Date (for By-Date view)
  const groupedByDate: DateGroupItem[] = useMemo(() => {
    const groups: Record<string, DateGroupItem> = {};

    filteredPhotos.forEach((photo) => {
      const d = photo.date;
      if (!groups[d]) {
        groups[d] = {
          date: d,
          totalCount: 0,
          teamsMap: {},
        };
      }
      groups[d].totalCount++;

      const tKey = photo.teamId || photo.teamName;
      if (!groups[d].teamsMap[tKey]) {
        groups[d].teamsMap[tKey] = {
          teamId: photo.teamId,
          teamName: photo.teamName,
          leaderName: photo.leaderName,
          worksiteName: photo.worksiteName,
          city: photo.city,
          photos: [],
          servicesMap: {},
        };
      }
      groups[d].teamsMap[tKey].photos.push(photo);

      const sKey = photo.service || 'Serviço Geral';
      if (!groups[d].teamsMap[tKey].servicesMap[sKey]) {
        groups[d].teamsMap[tKey].servicesMap[sKey] = [];
      }
      groups[d].teamsMap[tKey].servicesMap[sKey].push(photo);
    });

    return Object.values(groups).sort((a, b) => b.date.localeCompare(a.date));
  }, [filteredPhotos]);

  // Grouped by Team (for By-Team view)
  const groupedByTeam: TeamGroupItem[] = useMemo(() => {
    const groups: Record<string, TeamGroupItem> = {};

    filteredPhotos.forEach((photo) => {
      const tKey = photo.teamId || photo.teamName;
      if (!groups[tKey]) {
        groups[tKey] = {
          teamId: photo.teamId,
          teamName: photo.teamName,
          leaderName: photo.leaderName,
          totalPhotosCount: 0,
          datesMap: {},
        };
      }
      groups[tKey].totalPhotosCount++;

      const d = photo.date;
      if (!groups[tKey].datesMap[d]) {
        groups[tKey].datesMap[d] = {
          date: d,
          worksiteName: photo.worksiteName,
          city: photo.city,
          photos: [],
          servicesMap: {},
        };
      }
      groups[tKey].datesMap[d].photos.push(photo);

      const sKey = photo.service || 'Serviço Geral';
      if (!groups[tKey].datesMap[d].servicesMap[sKey]) {
        groups[tKey].datesMap[d].servicesMap[sKey] = [];
      }
      groups[tKey].datesMap[d].servicesMap[sKey].push(photo);
    });

    return Object.values(groups).sort((a, b) => b.totalPhotosCount - a.totalPhotosCount);
  }, [filteredPhotos]);

  // Reset all filters
  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedDate('TODAS');
    setStartDate('');
    setEndDate('');
    setSelectedTeamId('TODAS');
    setSelectedLeaderName('TODOS');
    setSelectedWorksiteId('TODAS');
    setSelectedService('TODOS');
    setCurrentPage(1);
  };

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedDate !== 'TODAS' ||
    startDate !== '' ||
    endDate !== '' ||
    selectedTeamId !== 'TODAS' ||
    selectedLeaderName !== 'TODOS' ||
    selectedWorksiteId !== 'TODAS' ||
    selectedService !== 'TODOS';

  // Lightbox handlers
  const openLightbox = (photo: ServicePhotoItem) => {
    const idx = filteredPhotos.findIndex((p) => p.id === photo.id);
    setLightboxIndex(idx >= 0 ? idx : 0);
    setActivePhotoModal(photo);
  };

  const handlePrevPhoto = useCallback(() => {
    if (filteredPhotos.length === 0) return;
    const newIdx = (lightboxIndex - 1 + filteredPhotos.length) % filteredPhotos.length;
    setLightboxIndex(newIdx);
    setActivePhotoModal(filteredPhotos[newIdx]);
  }, [filteredPhotos, lightboxIndex]);

  const handleNextPhoto = useCallback(() => {
    if (filteredPhotos.length === 0) return;
    const newIdx = (lightboxIndex + 1) % filteredPhotos.length;
    setLightboxIndex(newIdx);
    setActivePhotoModal(filteredPhotos[newIdx]);
  }, [filteredPhotos, lightboxIndex]);

  // Keyboard navigation for Lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activePhotoModal) return;
      if (e.key === 'ArrowLeft') handlePrevPhoto();
      if (e.key === 'ArrowRight') handleNextPhoto();
      if (e.key === 'Escape') setActivePhotoModal(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePhotoModal, handlePrevPhoto, handleNextPhoto]);

  // Toggle accordions
  const toggleDateTeam = (key: string) => {
    setExpandedDateTeams((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleTeamDate = (key: string) => {
    setExpandedTeamDates((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // ZIP Download Handlers
  const handleDownloadSinglePhoto = async (photo: ServicePhotoItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (currentUser) {
      recordServicePhotosAudit({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'DOWNLOAD_FOTOS',
        details: `Baixou foto individual da ${photo.teamName} (${photo.date} - ${photo.service})`,
        teamConsulted: photo.teamName,
        dateConsulted: photo.date,
      });
    }
    await downloadSinglePhoto(photo);
  };

  const handleDownloadServiceZip = async (
    photos: ServicePhotoItem[],
    serviceName: string,
    teamName: string,
    dateStr: string,
    e?: React.MouseEvent
  ) => {
    if (e) e.stopPropagation();
    if (photos.length === 0) return;

    setZipProgress({
      active: true,
      title: `Compactando ${photos.length} fotos de ${serviceName}...`,
      percent: 0,
      current: 0,
      total: photos.length,
    });

    const dateFormatted = dateStr ? dateStr.split('-').reverse().join('-') : 'data';
    const cleanServiceName = serviceName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
    const cleanTeamName = teamName.replace(/[^a-zA-Z0-9]/g, '_');
    const zipName = `Fotos_${cleanTeamName}_${dateFormatted}_${cleanServiceName}.zip`;

    if (currentUser) {
      recordServicePhotosAudit({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'DOWNLOAD_FOTOS',
        details: `Baixou pacote ZIP do serviço "${serviceName}" da ${teamName} em ${dateStr} (${photos.length} fotos)`,
        teamConsulted: teamName,
        dateConsulted: dateStr,
      });
    }

    await downloadPhotosZip(photos, zipName, (pct, curr, tot) => {
      setZipProgress((prev) => ({ ...prev, percent: pct, current: curr, total: tot }));
    });

    setTimeout(() => {
      setZipProgress({ active: false, title: '', percent: 0, current: 0, total: 0 });
    }, 1200);
  };

  const handleDownloadTeamDayZip = async (
    photos: ServicePhotoItem[],
    teamName: string,
    dateStr: string,
    e?: React.MouseEvent
  ) => {
    if (e) e.stopPropagation();
    if (photos.length === 0) return;

    setZipProgress({
      active: true,
      title: `Gerando ZIP de ${photos.length} fotos da ${teamName}...`,
      percent: 0,
      current: 0,
      total: photos.length,
    });

    const dateFormatted = dateStr ? dateStr.split('-').reverse().join('-') : 'data';
    const cleanTeamName = teamName.replace(/[^a-zA-Z0-9]/g, '_');
    const zipName = `Fotos_${cleanTeamName}_${dateFormatted}.zip`;

    if (currentUser) {
      recordServicePhotosAudit({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'DOWNLOAD_FOTOS',
        details: `Baixou todas as fotos da equipe ${teamName} do dia ${dateStr} (${photos.length} fotos)`,
        teamConsulted: teamName,
        dateConsulted: dateStr,
      });
    }

    await downloadPhotosZip(photos, zipName, (pct, curr, tot) => {
      setZipProgress((prev) => ({ ...prev, percent: pct, current: curr, total: tot }));
    });

    setTimeout(() => {
      setZipProgress({ active: false, title: '', percent: 0, current: 0, total: 0 });
    }, 1200);
  };

  const handleDownloadAllFilteredZip = async () => {
    if (filteredPhotos.length === 0) return;

    setZipProgress({
      active: true,
      title: `Compactando todas as ${filteredPhotos.length} fotos filtradas...`,
      percent: 0,
      current: 0,
      total: filteredPhotos.length,
    });

    const dateSuffix = selectedDate !== 'TODAS' ? selectedDate : new Date().toISOString().split('T')[0];
    const zipName = `Fotos_Servicos_${dateSuffix}.zip`;

    if (currentUser) {
      recordServicePhotosAudit({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'DOWNLOAD_FOTOS',
        details: `Baixou arquivo ZIP geral com ${filteredPhotos.length} fotos filtradas`,
        teamConsulted: selectedTeamId !== 'TODAS' ? selectedTeamId : undefined,
        dateConsulted: selectedDate !== 'TODAS' ? selectedDate : undefined,
      });
    }

    await downloadPhotosZip(filteredPhotos, zipName, (pct, curr, tot) => {
      setZipProgress((prev) => ({ ...prev, percent: pct, current: curr, total: tot }));
    });

    setTimeout(() => {
      setZipProgress({ active: false, title: '', percent: 0, current: 0, total: 0 });
    }, 1200);
  };

  // Report Generator
  const handleOpenReportModal = () => {
    if (currentUser) {
      recordServicePhotosAudit({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'GERACAO_RELATORIO',
        details: `Abriu modal de geração de relatório fotográfico com ${filteredPhotos.length} fotos`,
      });
    }
    setReportModalOpen(true);
  };

  const handleExportPdfReport = () => {
    const filtersDesc = [
      selectedDate !== 'TODAS' ? `Data: ${selectedDate.split('-').reverse().join('/')}` : '',
      selectedTeamId !== 'TODAS' ? `Equipe: ${availableTeams.find((t) => t.id === selectedTeamId)?.name}` : '',
      selectedWorksiteId !== 'TODAS'
        ? `Obra: ${availableWorksites.find((w) => w.id === selectedWorksiteId)?.name}`
        : '',
      selectedService !== 'TODOS' ? `Serviço: ${selectedService}` : '',
      searchQuery ? `Busca: "${searchQuery}"` : '',
    ]
      .filter(Boolean)
      .join(' | ');

    generatePhotoReportPdf(filteredPhotos, {
      title: 'Relatório Geral de Fotos de Serviços',
      generatedBy: currentUser,
      filtersDescription: filtersDesc || 'Todos os registros disponíveis',
    });

    if (currentUser) {
      recordServicePhotosAudit({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'GERACAO_RELATORIO',
        details: `Exportou Relatório PDF com ${filteredPhotos.length} fotos de serviços`,
      });
    }
  };

  const handlePrintReport = () => {
    window.print();
  };

  // Security Gatekeeper: Non-authorized users blocked
  if (!hasAccess) {
    return (
      <div className="bg-white rounded-2xl border border-red-200 p-8 text-center max-w-xl mx-auto my-12 shadow-sm space-y-4">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Acesso Exclusivo para Administradores e Gestores</h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          A aba <strong>Fotos dos Serviços</strong> é restrita a Administradores (Luiz Henrique) e Gestores (Ademar
          Mattos, Mauricio Galvão, Filipi Mattos, Rafael Leal). Chefes de equipe possuem acesso apenas aos seus
          próprios relatórios diários de obras.
        </p>
        {onNavigateTab && (
          <button
            onClick={() => onNavigateTab('dashboard')}
            className="px-5 py-2.5 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800 transition-colors"
          >
            Voltar para o Painel
          </button>
        )}
      </div>
    );
  }

  // Format Helper Date
  const formatDateBR = (dStr: string) => {
    if (!dStr) return '';
    const parts = dStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dStr;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Fotos dos Serviços</h1>
                <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200/60 rounded-full text-[11px] font-bold">
                  Galeria Geral
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Acompanhamento fotográfico completo de serviços executados, organizado por data, equipe e local.
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleOpenReportModal}
            className="px-4 py-2 bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 rounded-xl text-xs font-bold flex items-center space-x-2 shadow-2xs transition-colors"
          >
            <FileText className="w-4 h-4 text-blue-600" />
            <span>Gerar Relatório</span>
          </button>

          <button
            onClick={handleDownloadAllFilteredZip}
            disabled={filteredPhotos.length === 0}
            className="px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-xs font-bold flex items-center space-x-2 shadow-2xs transition-colors"
          >
            <FolderArchive className="w-4 h-4 text-amber-400" />
            <span>Baixar Todas ({filteredPhotos.length})</span>
          </button>
        </div>
      </div>

      {/* FILTERS & SEARCH CONTROL PANEL */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
        {/* Top Search Bar & View Mode Switcher */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Quick Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar equipe, chefe, obra, serviço, cidade ou legenda..."
              className="w-full pl-9 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* View Mode Toggle Buttons */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl shrink-0 self-start sm:self-auto">
            <button
              onClick={() => setViewMode('BY_DATE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all ${
                viewMode === 'BY_DATE' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Ver por Data</span>
            </button>

            <button
              onClick={() => setViewMode('BY_TEAM')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all ${
                viewMode === 'BY_TEAM' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Ver por Equipe</span>
            </button>

            <button
              onClick={() => setViewMode('GRID')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all ${
                viewMode === 'GRID' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Grade Geral</span>
            </button>
          </div>

          {/* Toggle Advanced Filters Button */}
          <button
            onClick={() => setFiltersExpanded(!filtersExpanded)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border flex items-center space-x-1.5 transition-colors ${
              filtersExpanded || hasActiveFilters
                ? 'bg-blue-50 text-blue-700 border-blue-300'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filtros Detalhados</span>
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-blue-600 ml-1 inline-block" />
            )}
          </button>
        </div>

        {/* Quick Date Pills */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 pt-1 border-t border-slate-100 text-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
            Datas Rápidas:
          </span>
          <button
            onClick={() => {
              setSelectedDate('TODAS');
              setStartDate('');
              setEndDate('');
            }}
            className={`px-3 py-1 rounded-lg font-semibold shrink-0 transition-colors ${
              selectedDate === 'TODAS' && !startDate && !endDate
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todas as Datas ({allServicePhotos.length})
          </button>

          {availableDates.map((dateStr) => {
            const count = allServicePhotos.filter((p) => p.date === dateStr).length;
            const isSelected = selectedDate === dateStr;
            return (
              <button
                key={dateStr}
                onClick={() => {
                  setSelectedDate(dateStr);
                  setStartDate('');
                  setEndDate('');
                }}
                className={`px-3 py-1 rounded-lg font-semibold shrink-0 transition-colors ${
                  isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {formatDateBR(dateStr)} ({count})
              </button>
            );
          })}
        </div>

        {/* Detailed Filters Grid (Collapsible/Expandable) */}
        {filtersExpanded && (
          <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Filter: Date Specific */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Data Específica
              </label>
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="TODAS">Todas as datas</option>
                {availableDates.map((d) => (
                  <option key={d} value={d}>
                    {formatDateBR(d)}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter: Team */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Equipe
              </label>
              <select
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="TODAS">Todas as equipes</option>
                {availableTeams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter: Team Leader */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Chefe de Equipe
              </label>
              <select
                value={selectedLeaderName}
                onChange={(e) => setSelectedLeaderName(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="TODOS">Todos os chefes</option>
                {availableLeaders.map((ldr) => (
                  <option key={ldr} value={ldr}>
                    {ldr}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter: Worksite */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Obra / Local
              </label>
              <select
                value={selectedWorksiteId}
                onChange={(e) => setSelectedWorksiteId(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 truncate"
              >
                <option value="TODAS">Todas as obras</option>
                {availableWorksites.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter: Service */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Serviço
              </label>
              <select
                value={selectedService}
                onChange={(e) => setSelectedService(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 truncate"
              >
                <option value="TODOS">Todos os serviços</option>
                {availableServices.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter: Clear Action */}
            <div className="flex items-end">
              <button
                onClick={handleClearFilters}
                className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center justify-center space-x-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Limpar Filtros</span>
              </button>
            </div>
          </div>
        )}

        {/* Counter Summary Bar */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
          <div>
            Mostrando <strong className="text-slate-900">{filteredPhotos.length} fotos</strong> encontradas
            {filteredPhotos.length !== allServicePhotos.length && (
              <span className="text-slate-400 ml-1">(de um total de {allServicePhotos.length})</span>
            )}
          </div>
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
            >
              Remover todos os filtros
            </button>
          )}
        </div>
      </div>

      {/* MAIN GALLERY CONTENT BASED ON VIEW MODE */}

      {/* 1. VIEW MODE: POR DIA (ORGANIZADO POR DATA -> EQUIPES -> SERVIÇOS -> FOTOS) */}
      {viewMode === 'BY_DATE' && (
        <div className="space-y-8">
          {groupedByDate.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 space-y-3">
              <Camera className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="font-semibold text-sm">Nenhuma foto encontrada para os filtros selecionados.</p>
              <button
                onClick={handleClearFilters}
                className="text-xs text-blue-600 hover:underline font-bold"
              >
                Limpar filtros para visualizar todas as fotos
              </button>
            </div>
          ) : (
            groupedByDate.map((dateGroup: DateGroupItem) => (
              <div
                key={dateGroup.date}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden"
              >
                {/* Date Header Banner */}
                <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white px-5 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-white/10 text-white flex items-center justify-center font-bold">
                      <Calendar className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center space-x-2">
                        <span>{formatDateBR(dateGroup.date)}</span>
                        <span className="text-xs font-normal text-slate-300">
                          ({dateGroup.totalCount} fotos no dia)
                        </span>
                      </h2>
                      <p className="text-xs text-slate-400">
                        {Object.keys(dateGroup.teamsMap).length} equipe(s) em campo
                      </p>
                    </div>
                  </div>

                  {/* Summary badges of teams */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(Object.values(dateGroup.teamsMap) as TeamInDateGroup[]).map((teamData) => (
                      <span
                        key={teamData.teamId || teamData.teamName}
                        className="px-2.5 py-1 bg-white/10 text-slate-200 text-[11px] font-semibold rounded-lg border border-white/10"
                      >
                        {teamData.teamName} ({teamData.photos.length} fotos)
                      </span>
                    ))}
                  </div>
                </div>

                {/* Teams List inside this Date */}
                <div className="p-5 sm:p-6 space-y-6 divide-y divide-slate-100">
                  {(Object.values(dateGroup.teamsMap) as TeamInDateGroup[]).map((teamData, teamIndex) => {
                    const accordionKey = `${dateGroup.date}_${teamData.teamId || teamData.teamName}`;
                    const isExpanded = expandedDateTeams[accordionKey] !== false; // Default expanded

                    return (
                      <div key={accordionKey} className={teamIndex > 0 ? 'pt-6' : ''}>
                        {/* Team Section Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80 mb-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                              <HardHat className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <h3 className="text-sm font-bold text-slate-900">{teamData.teamName}</h3>
                                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[11px] font-black rounded-md border border-blue-200">
                                  {teamData.photos.length} fotos
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5">
                                Chefe: <strong>{teamData.leaderName}</strong> • Obra: <strong>{teamData.worksiteName}</strong> ({teamData.city})
                              </p>
                            </div>
                          </div>

                          {/* Team Actions */}
                          <div className="flex items-center space-x-2 self-end sm:self-auto">
                            <button
                              onClick={(e) =>
                                handleDownloadTeamDayZip(teamData.photos, teamData.teamName, dateGroup.date, e)
                              }
                              className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-2xs transition-colors"
                              title="Baixar todas as fotos desta equipe nesta data em ZIP"
                            >
                              <Download className="w-3.5 h-3.5 text-blue-600" />
                              <span>Baixar ZIP da Equipe ({teamData.photos.length})</span>
                            </button>

                            <button
                              onClick={() => toggleDateTeam(accordionKey)}
                              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        {/* Services Breakdown inside this Team */}
                        {isExpanded && (
                          <div className="space-y-6 pl-2 sm:pl-4 border-l-2 border-slate-200 ml-2">
                            {(Object.entries(teamData.servicesMap) as [string, ServicePhotoItem[]][]).map(([serviceName, servicePhotos]) => (
                              <div key={serviceName} className="space-y-3">
                                {/* Service Header */}
                                <div className="flex items-center justify-between bg-slate-100/70 px-3.5 py-2 rounded-lg">
                                  <div className="flex items-center space-x-2">
                                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                                    <h4 className="text-xs font-bold text-slate-800">
                                      Serviço: <span className="text-blue-700">{serviceName}</span>
                                    </h4>
                                    <span className="text-[11px] text-slate-500 font-medium">
                                      ({servicePhotos.length} {servicePhotos.length === 1 ? 'foto' : 'fotos'})
                                    </span>
                                  </div>

                                  <button
                                    onClick={(e) =>
                                      handleDownloadServiceZip(
                                        servicePhotos,
                                        serviceName,
                                        teamData.teamName,
                                        dateGroup.date,
                                        e
                                      )
                                    }
                                    className="text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200 flex items-center space-x-1 shadow-2xs"
                                  >
                                    <Download className="w-3 h-3 text-slate-500" />
                                    <span>Baixar ZIP deste serviço</span>
                                  </button>
                                </div>

                                {/* Photo Grid for this Service */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                  {servicePhotos.map((photo) => (
                                    <PhotoThumbnailCard
                                      key={photo.id}
                                      photo={photo}
                                      onClick={() => openLightbox(photo)}
                                      onDownloadSingle={(e) => handleDownloadSinglePhoto(photo, e)}
                                    />
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 2. VIEW MODE: POR EQUIPE (HISTÓRICO POR EQUIPE ORGANIZADO POR DATA) */}
      {viewMode === 'BY_TEAM' && (
        <div className="space-y-8">
          {groupedByTeam.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 space-y-3">
              <Users className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="font-semibold text-sm">Nenhuma equipe encontrada para os filtros atuais.</p>
              <button
                onClick={handleClearFilters}
                className="text-xs text-blue-600 hover:underline font-bold"
              >
                Limpar filtros
              </button>
            </div>
          ) : (
            groupedByTeam.map((teamGroup: TeamGroupItem) => (
              <div
                key={teamGroup.teamId || teamGroup.teamName}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden"
              >
                {/* Team Header Banner */}
                <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-slate-800 text-white px-5 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-white/10 text-white flex items-center justify-center font-bold">
                      <HardHat className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h2 className="text-base sm:text-lg font-black tracking-tight">{teamGroup.teamName}</h2>
                        <span className="px-2 py-0.5 bg-amber-400/20 text-amber-300 border border-amber-400/30 rounded text-[11px] font-bold">
                          {teamGroup.totalPhotosCount} fotos registradas
                        </span>
                      </div>
                      <p className="text-xs text-slate-300">
                        Chefe de Equipe: <strong>{teamGroup.leaderName}</strong> • {Object.keys(teamGroup.datesMap).length} dia(s) com registros
                      </p>
                    </div>
                  </div>

                  {/* Summary of dates */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(Object.entries(teamGroup.datesMap) as [string, DateInTeamGroup][]).map(([dStr, dData]) => (
                      <span
                        key={dStr}
                        className="px-2.5 py-1 bg-white/10 text-slate-200 text-[11px] font-semibold rounded-lg border border-white/10"
                      >
                        {formatDateBR(dStr)} ({dData.photos.length})
                      </span>
                    ))}
                  </div>
                </div>

                {/* Days Breakdown for this Team */}
                <div className="p-5 sm:p-6 space-y-6 divide-y divide-slate-100">
                  {(Object.entries(teamGroup.datesMap) as [string, DateInTeamGroup][]).map(([dateStr, dateData], dateIndex) => {
                    const accordionKey = `team_${teamGroup.teamId}_${dateStr}`;
                    const isExpanded = expandedTeamDates[accordionKey] !== false;

                    return (
                      <div key={accordionKey} className={dateIndex > 0 ? 'pt-6' : ''}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80 mb-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                              <Calendar className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <h3 className="text-sm font-bold text-slate-900">{formatDateBR(dateStr)}</h3>
                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[11px] font-black rounded-md border border-emerald-200">
                                  {dateData.photos.length} fotos
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5">
                                Obra: <strong>{dateData.worksiteName}</strong> ({dateData.city})
                              </p>
                            </div>
                          </div>

                          {/* Action Button */}
                          <div className="flex items-center space-x-2 self-end sm:self-auto">
                            <button
                              onClick={(e) =>
                                handleDownloadTeamDayZip(dateData.photos, teamGroup.teamName, dateStr, e)
                              }
                              className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-2xs transition-colors"
                            >
                              <Download className="w-3.5 h-3.5 text-blue-600" />
                              <span>Baixar Fotos do Dia (ZIP)</span>
                            </button>

                            <button
                              onClick={() => toggleTeamDate(accordionKey)}
                              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        {/* Services inside this Day */}
                        {isExpanded && (
                          <div className="space-y-6 pl-2 sm:pl-4 border-l-2 border-slate-200 ml-2">
                            {(Object.entries(dateData.servicesMap) as [string, ServicePhotoItem[]][]).map(([serviceName, servicePhotos]) => (
                              <div key={serviceName} className="space-y-3">
                                <div className="flex items-center justify-between bg-slate-100/70 px-3.5 py-2 rounded-lg">
                                  <div className="flex items-center space-x-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-600" />
                                    <h4 className="text-xs font-bold text-slate-800">
                                      Serviço: <span className="text-slate-900">{serviceName}</span>
                                    </h4>
                                    <span className="text-[11px] text-slate-500 font-medium">
                                      ({servicePhotos.length} fotos)
                                    </span>
                                  </div>

                                  <button
                                    onClick={(e) =>
                                      handleDownloadServiceZip(
                                        servicePhotos,
                                        serviceName,
                                        teamGroup.teamName,
                                        dateStr,
                                        e
                                      )
                                    }
                                    className="text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200 flex items-center space-x-1 shadow-2xs"
                                  >
                                    <Download className="w-3 h-3 text-slate-500" />
                                    <span>Baixar ZIP deste serviço</span>
                                  </button>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                  {servicePhotos.map((photo) => (
                                    <PhotoThumbnailCard
                                      key={photo.id}
                                      photo={photo}
                                      onClick={() => openLightbox(photo)}
                                      onDownloadSingle={(e) => handleDownloadSinglePhoto(photo, e)}
                                    />
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 3. VIEW MODE: GRADE GERAL / MOSAICO FLUIDO COM PAGINAÇÃO */}
      {viewMode === 'GRID' && (
        <div className="space-y-6">
          {filteredPhotos.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 space-y-3">
              <Layers className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="font-semibold text-sm">Nenhuma foto atende aos critérios selecionados.</p>
              <button
                onClick={handleClearFilters}
                className="text-xs text-blue-600 hover:underline font-bold"
              >
                Limpar filtros
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {filteredPhotos
                  .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                  .map((photo) => (
                    <PhotoThumbnailCard
                      key={photo.id}
                      photo={photo}
                      onClick={() => openLightbox(photo)}
                      onDownloadSingle={(e) => handleDownloadSinglePhoto(photo, e)}
                    />
                  ))}
              </div>

              {/* Pagination Controls */}
              {Math.ceil(filteredPhotos.length / ITEMS_PER_PAGE) > 1 && (
                <div className="flex items-center justify-between bg-white px-5 py-3 rounded-xl border border-slate-200 text-xs">
                  <span className="text-slate-500">
                    Página <strong>{currentPage}</strong> de{' '}
                    <strong>{Math.ceil(filteredPhotos.length / ITEMS_PER_PAGE)}</strong> ({filteredPhotos.length} fotos)
                  </span>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 border border-slate-200 rounded-lg font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                    >
                      Anterior
                    </button>
                    <button
                      onClick={() =>
                        setCurrentPage((p) => Math.min(Math.ceil(filteredPhotos.length / ITEMS_PER_PAGE), p + 1))
                      }
                      disabled={currentPage === Math.ceil(filteredPhotos.length / ITEMS_PER_PAGE)}
                      className="px-3 py-1.5 border border-slate-200 rounded-lg font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                    >
                      Próxima
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* FULLSCREEN PHOTO LIGHTBOX MODAL */}
      {activePhotoModal && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6"
          onClick={() => setActivePhotoModal(null)}
        >
          <div
            className="bg-slate-900 text-white rounded-2xl border border-slate-800 max-w-5xl w-full max-h-[95vh] flex flex-col overflow-hidden shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Lightbox Header */}
            <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
              <div className="flex items-center space-x-3 truncate">
                <span className="px-2.5 py-0.5 bg-blue-600 text-white text-[11px] font-black rounded-md uppercase tracking-wider">
                  Foto {lightboxIndex + 1} de {filteredPhotos.length}
                </span>
                <span className="text-xs font-bold text-slate-200 truncate">
                  {activePhotoModal.teamName} • {activePhotoModal.service}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleDownloadSinglePhoto(activePhotoModal)}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors"
                  title="Baixar foto JPG"
                >
                  <Download className="w-3.5 h-3.5 text-blue-400" />
                  <span className="hidden sm:inline">Baixar Foto</span>
                </button>

                <button
                  onClick={() => setActivePhotoModal(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Lightbox Body (Image + Inspector) */}
            <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-y-auto">
              {/* Image Viewport with Previous/Next Arrows */}
              <div className="relative flex-1 bg-black flex items-center justify-center p-4 min-h-[300px] sm:min-h-[450px]">
                <img
                  src={activePhotoModal.url}
                  alt={activePhotoModal.caption || 'Foto do serviço'}
                  className="max-h-[70vh] max-w-full object-contain rounded-lg select-none shadow-lg"
                />

                {/* Left Arrow Button */}
                <button
                  onClick={handlePrevPhoto}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-900/80 hover:bg-blue-600 text-white flex items-center justify-center backdrop-blur-xs transition-all shadow-lg"
                  title="Foto Anterior (←)"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>

                {/* Right Arrow Button */}
                <button
                  onClick={handleNextPhoto}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-900/80 hover:bg-blue-600 text-white flex items-center justify-center backdrop-blur-xs transition-all shadow-lg"
                  title="Próxima Foto (→)"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>

              {/* Metadata Inspector Sidebar */}
              <div className="w-full lg:w-84 bg-slate-900 p-5 border-t lg:border-t-0 lg:border-l border-slate-800 flex flex-col justify-between space-y-4 shrink-0 text-xs">
                <div className="space-y-3.5">
                  <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-2 flex items-center">
                    <Sparkles className="w-4 h-4 text-amber-400 mr-2" />
                    Detalhes do Registro
                  </h3>

                  <div className="space-y-2.5 text-slate-300">
                    <div className="flex items-start justify-between">
                      <span className="text-slate-400">📅 Data:</span>
                      <strong className="text-white font-semibold">{formatDateBR(activePhotoModal.date)}</strong>
                    </div>

                    <div className="flex items-start justify-between">
                      <span className="text-slate-400">⏰ Horário:</span>
                      <strong className="text-white font-semibold">{activePhotoModal.timeFormatted || '22:14'}</strong>
                    </div>

                    <div className="flex items-start justify-between">
                      <span className="text-slate-400">👷 Equipe:</span>
                      <strong className="text-blue-400 font-semibold">{activePhotoModal.teamName}</strong>
                    </div>

                    <div className="flex items-start justify-between">
                      <span className="text-slate-400">👤 Chefe de Equipe:</span>
                      <strong className="text-white font-semibold">{activePhotoModal.leaderName}</strong>
                    </div>

                    <div className="flex items-start justify-between">
                      <span className="text-slate-400">📍 Obra / Local:</span>
                      <span className="text-right font-medium text-slate-200">
                        {activePhotoModal.worksiteName} ({activePhotoModal.city})
                      </span>
                    </div>

                    <div className="flex items-start justify-between">
                      <span className="text-slate-400">🛠️ Serviço:</span>
                      <span className="text-right font-semibold text-emerald-400">{activePhotoModal.service}</span>
                    </div>

                    {activePhotoModal.latitude && activePhotoModal.longitude && (
                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">🗺️ Coordenadas GPS:</span>
                          <span className="text-amber-400 font-mono">
                            {activePhotoModal.latitude.toFixed(4)}, {activePhotoModal.longitude.toFixed(4)}
                          </span>
                        </div>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${activePhotoModal.latitude},${activePhotoModal.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-[11px] flex items-center justify-center space-x-1 transition-colors"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          <span>Abrir Localização no Mapa</span>
                          <ExternalLink className="w-3 h-3 ml-0.5" />
                        </a>
                      </div>
                    )}

                    {activePhotoModal.caption && (
                      <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Legenda / Observação:
                        </span>
                        <p className="text-slate-300 italic text-[11px]">{activePhotoModal.caption}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Actions inside Inspector */}
                <div className="pt-3 border-t border-slate-800 space-y-2">
                  <button
                    onClick={() => handleDownloadSinglePhoto(activePhotoModal)}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center justify-center space-x-2 transition-colors shadow-sm"
                  >
                    <Download className="w-4 h-4" />
                    <span>Baixar Esta Foto (JPG)</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ZIP GENERATION PROGRESS MODAL */}
      {zipProgress.active && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto animate-pulse">
              <FolderArchive className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{zipProgress.title}</h3>
              <p className="text-xs text-slate-500 mt-1">
                Compactando fotos em alta resolução. O download iniciará automaticamente.
              </p>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-300 ease-out"
                style={{ width: `${zipProgress.percent}%` }}
              />
            </div>
            <div className="flex justify-between text-xs font-bold text-slate-600">
              <span>{zipProgress.percent}% concluído</span>
              <span>
                {zipProgress.current} de {zipProgress.total} fotos
              </span>
            </div>
          </div>
        </div>
      )}

      {/* PHOTO REPORT MODAL & PRINT PREVIEW */}
      {reportModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
          onClick={() => setReportModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Report Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-900">Relatório Fotográfico de Execução</h3>
                <p className="text-xs text-slate-500">
                  Visualização consolidada e exportação de fotos de serviços para auditoria e clientes.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handlePrintReport}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors"
                >
                  <Printer className="w-4 h-4 text-slate-600" />
                  <span>Imprimir</span>
                </button>

                <button
                  onClick={handleExportPdfReport}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-xs"
                >
                  <FileDown className="w-4 h-4" />
                  <span>Baixar PDF</span>
                </button>

                <button
                  onClick={() => setReportModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Report Body */}
            <div className="flex-1 p-6 overflow-y-auto space-y-6 text-slate-800 text-xs">
              {/* Document Letterhead */}
              <div className="border-b-2 border-slate-800 pb-4 flex justify-between items-start">
                <div>
                  <h2 className="text-lg font-black tracking-tight text-slate-900">GESTORCAMPO • OBRAS TOTAL</h2>
                  <p className="text-xs font-bold text-slate-600">SISTEMA INTEGRADO DE GESTÃO DE OBRAS E SINALIZAÇÃO</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Relatório emitido em {new Date().toLocaleDateString('pt-BR')} às{' '}
                    {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} por{' '}
                    <strong>{currentUser?.name || 'Administrador / Gestor'}</strong>
                  </p>
                </div>
                <div className="text-right">
                  <span className="px-2.5 py-1 bg-slate-900 text-white font-mono text-xs font-bold rounded">
                    TOTAL: {filteredPhotos.length} FOTOS
                  </span>
                </div>
              </div>

              {/* Report Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-500 text-[10px] uppercase font-bold block">Total de Fotos</span>
                  <span className="text-base font-black text-slate-900">{filteredPhotos.length}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-500 text-[10px] uppercase font-bold block">Datas Abrangidas</span>
                  <span className="text-base font-black text-slate-900">
                    {Array.from(new Set(filteredPhotos.map((p) => p.date))).length}
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-500 text-[10px] uppercase font-bold block">Equipes</span>
                  <span className="text-base font-black text-slate-900">
                    {Array.from(new Set(filteredPhotos.map((p) => p.teamName))).length}
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-500 text-[10px] uppercase font-bold block">Obras</span>
                  <span className="text-base font-black text-slate-900">
                    {Array.from(new Set(filteredPhotos.map((p) => p.worksiteName))).length}
                  </span>
                </div>
              </div>

              {/* Detailed Photo Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-[11px] divide-y divide-slate-200">
                  <thead className="bg-slate-100 font-bold text-slate-700">
                    <tr>
                      <th className="p-2.5">#</th>
                      <th className="p-2.5">Foto</th>
                      <th className="p-2.5">Data / Hora</th>
                      <th className="p-2.5">Equipe & Chefe</th>
                      <th className="p-2.5">Obra / Local</th>
                      <th className="p-2.5">Serviço</th>
                      <th className="p-2.5">GPS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPhotos.map((p, idx) => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="p-2.5 font-bold text-slate-500">{idx + 1}</td>
                        <td className="p-2.5">
                          <img
                            src={p.url}
                            alt="Miniatura"
                            className="w-12 h-12 object-cover rounded-md border border-slate-200"
                          />
                        </td>
                        <td className="p-2.5 font-semibold">
                          {formatDateBR(p.date)} <br />
                          <span className="text-slate-500 font-normal">{p.timeFormatted}</span>
                        </td>
                        <td className="p-2.5 font-semibold">
                          {p.teamName} <br />
                          <span className="text-slate-500 font-normal">Chefe: {p.leaderName}</span>
                        </td>
                        <td className="p-2.5">
                          <strong>{p.worksiteName}</strong> <br />
                          <span className="text-slate-500">{p.city}</span>
                        </td>
                        <td className="p-2.5 font-semibold text-blue-700">{p.service}</td>
                        <td className="p-2.5 font-mono text-[10px] text-slate-500">
                          {p.latitude && p.longitude
                            ? `${p.latitude.toFixed(4)}, ${p.longitude.toFixed(4)}`
                            : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// MINIATURA DE FOTO COMPACTA (CARD)
interface PhotoThumbnailCardProps {
  photo: ServicePhotoItem;
  onClick: () => void;
  onDownloadSingle: (e: React.MouseEvent) => void;
}

const PhotoThumbnailCard: React.FC<PhotoThumbnailCardProps> = ({ photo, onClick, onDownloadSingle }) => {
  const formatDateBR = (dStr: string) => {
    if (!dStr) return '';
    const parts = dStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
    return dStr;
  };

  return (
    <div
      onClick={onClick}
      className="group relative bg-white rounded-xl border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-blue-400 transition-all duration-200 cursor-pointer overflow-hidden flex flex-col"
    >
      {/* Thumbnail Image */}
      <div className="relative aspect-4/3 w-full bg-slate-100 overflow-hidden">
        <img
          src={photo.url}
          alt={photo.caption || photo.service}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* Hover overlay with action icons */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center space-x-2">
          <div className="p-2 rounded-full bg-white text-slate-900 shadow-md">
            <Eye className="w-4 h-4" />
          </div>
          <button
            onClick={onDownloadSingle}
            className="p-2 rounded-full bg-blue-600 text-white shadow-md hover:bg-blue-500 transition-colors"
            title="Baixar foto"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>

        {/* Time / Date chip */}
        <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-slate-900/80 backdrop-blur-xs text-white rounded text-[10px] font-bold flex items-center space-x-1">
          <Clock className="w-2.5 h-2.5 text-blue-400" />
          <span>{photo.timeFormatted || '08:00'}</span>
        </div>

        {/* GPS icon if coordinates exist */}
        {photo.latitude && photo.longitude && (
          <div
            className="absolute top-1.5 right-1.5 p-1 bg-slate-900/80 backdrop-blur-xs text-amber-400 rounded text-[10px]"
            title={`GPS: ${photo.latitude.toFixed(4)}, ${photo.longitude.toFixed(4)}`}
          >
            <MapPin className="w-3 h-3" />
          </div>
        )}
      </div>

      {/* Metadata Bottom Chips */}
      <div className="p-2.5 flex-1 flex flex-col justify-between space-y-1">
        <div>
          <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
            <span className="truncate">{photo.teamName.replace('Equipe ', '')}</span>
            <span className="font-bold text-slate-700">{formatDateBR(photo.date)}</span>
          </div>

          <p className="text-xs font-bold text-slate-900 truncate mt-0.5" title={photo.service}>
            {photo.service}
          </p>
          <p className="text-[11px] text-slate-500 truncate" title={photo.worksiteName}>
            {photo.worksiteName}
          </p>
        </div>

        {photo.caption && (
          <p className="text-[10px] text-slate-400 truncate italic" title={photo.caption}>
            {photo.caption}
          </p>
        )}
      </div>
    </div>
  );
};
