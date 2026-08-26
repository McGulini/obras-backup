import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  MapPin,
  Calendar,
  Users,
  HardHat,
  Filter,
  Clock,
  Navigation,
  CheckCircle2,
  AlertCircle,
  Building2,
  Coffee,
  RotateCcw,
  Radio,
  LocateFixed,
  Download,
  Share2,
  RefreshCw,
  SlidersHorizontal,
  FileSpreadsheet,
  Layers,
  Activity,
  ArrowRight,
  Info,
  ChevronRight,
  Table as TableIcon,
  Compass,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useGpsTracking } from '../context/GpsTrackingContext';
import { GpsPoint, GpsDayTrajectory, VisitedWorksiteStop, TrajectoryStop } from '../types';
import { fetchGpsPoints, fetchGpsLatest, sendGpsTrack } from '../services/api';
import {
  buildDayTrajectoryFromPoints,
  formatCoordinates,
  formatDurationMinutes,
  getOfflineGpsQueue,
  TrajectoryTimelineEvent,
} from '../services/gpsUtils';
import { GpsTrackingStatusWidget } from './GpsTrackingStatusWidget';
import L from 'leaflet';

export const TeamRouteHistory: React.FC = () => {
  const { currentUser, isAdmin, isLeader } = useAuth();
  const { users = [], teams = [], worksites = [] } = useData();
  const { isTrackingActive, startTracking, openPermissionModal, openMobileArchitectureModal } = useGpsTracking();

  // Filter States
  const todayStr = '2026-08-20'; // Current system mock day
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedUserId, setSelectedUserId] = useState<string>('user-chefe-elisson');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [minStopMinutes, setMinStopMinutes] = useState<number>(15); // Configurable threshold (default 15m)

  // View tabs: 'MAP' | 'TIMELINE' | 'TABLE'
  const [activeTab, setActiveTab] = useState<'MAP' | 'TIMELINE' | 'TABLE'>('MAP');

  // Data States
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [rawPoints, setRawPoints] = useState<GpsPoint[]>([]);
  const [latestLocations, setLatestLocations] = useState<any[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<GpsPoint | null>(null);
  const [filterPointType, setFilterPointType] = useState<string>('ALL');
  const [showStopsOnly, setShowStopsOnly] = useState<boolean>(false);

  // Manual GPS Ping state
  const [trackingFeedback, setTrackingFeedback] = useState<string | null>(null);

  // Map DOM and Leaflet References
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layersGroupRef = useRef<L.LayerGroup | null>(null);

  // List of all field leaders (Chefes de Equipe)
  const fieldLeaders = useMemo(() => {
    return (users || []).filter((u) => u.role === 'CHEFE_EQUIPE' && u.active);
  }, [users]);

  // Selected User Object & Team Object
  const selectedUser = useMemo(() => {
    return (users || []).find((u) => u.id === selectedUserId) || fieldLeaders[0];
  }, [users, selectedUserId, fieldLeaders]);

  const selectedTeam = useMemo(() => {
    return (
      (teams || []).find(
        (t) => t.id === selectedTeamId || t.leaderId === selectedUserId || t.leaderName === selectedUser?.name
      ) || null
    );
  }, [teams, selectedTeamId, selectedUserId, selectedUser]);

  // Sync leader dropdown if current user is field leader
  useEffect(() => {
    if (isLeader && currentUser) {
      setSelectedUserId(currentUser.id);
      if (currentUser.teamId) {
        setSelectedTeamId(currentUser.teamId);
      }
    }
  }, [isLeader, currentUser]);

  // Load points & latest positions
  const loadTrajectoryData = async () => {
    setLoading(true);
    try {
      // 1. Fetch raw points from API
      const points = await fetchGpsPoints({
        date: selectedDate,
        userId: selectedUserId || undefined,
        teamId: selectedTeamId || undefined,
      });
      setRawPoints(points);

      // 2. Fetch latest online status for leaders
      const latest = await fetchGpsLatest();
      setLatestLocations(latest);
    } catch (err) {
      console.error('Failed to load GPS trajectory data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrajectoryData();
  }, [selectedDate, selectedUserId, selectedTeamId]);

  // Build structured day trajectory using purely chronological sensor data
  const trajectoryData = useMemo(() => {
    return buildDayTrajectoryFromPoints(
      rawPoints,
      selectedDate,
      selectedUserId,
      selectedUser?.name || 'Chefe de Equipe',
      selectedTeam?.id || selectedUser?.teamId || '',
      selectedTeam?.name || 'Equipe',
      worksites,
      minStopMinutes
    );
  }, [rawPoints, selectedDate, selectedUserId, selectedUser, selectedTeam, worksites, minStopMinutes]);

  // Filtered list of points for chronological table
  const displayedPoints = useMemo(() => {
    let list = [...(trajectoryData.points || [])];
    if (filterPointType !== 'ALL') {
      list = list.filter((p) => p.pointType === filterPointType);
    }
    if (showStopsOnly) {
      list = list.filter((p) => p.pointType === 'STOP' || p.pointType === 'WORKSITE');
    }
    return list;
  }, [trajectoryData.points, filterPointType, showStopsOnly]);

  // Initialize and Render Leaflet Map
  useEffect(() => {
    if (activeTab !== 'MAP') return;
    if (!mapContainerRef.current) return;

    // Initialize map if not yet created
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [-25.4612, -49.2635], // Default Curitiba
        zoom: 12,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(map);

      layersGroupRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    const layerGroup = layersGroupRef.current;
    if (!map || !layerGroup) return;

    // Clear previous layers
    layerGroup.clearLayers();

    const points = trajectoryData.points || [];

    if (points.length === 0) {
      map.setView([-25.4612, -49.2635], 12);
      return;
    }

    // 1. Draw Chronological Trajectory Polyline (NO routing, connects P1 -> P2 -> P3 in order)
    const latLngs: L.LatLngExpression[] = points.map((p) => [p.latitude, p.longitude]);

    // Outer glow casing line
    const backgroundLine = L.polyline(latLngs, {
      color: '#1e3a8a', // Dark Navy
      weight: 6,
      opacity: 0.4,
      lineCap: 'round',
      lineJoin: 'round',
    });
    layerGroup.addLayer(backgroundLine);

    // Inner bright directional polyline
    const mainPolyline = L.polyline(latLngs, {
      color: '#2563eb', // Royal Blue
      weight: 3.5,
      opacity: 0.95,
      dashArray: '8, 4',
      lineCap: 'round',
      lineJoin: 'round',
    });
    layerGroup.addLayer(mainPolyline);

    // 2. Add Markers for Start, End, Worksites, and Intermediate Breadcrumbs
    points.forEach((point, index) => {
      const isStart = index === 0;
      const isEnd = index === points.length - 1;
      const isWorksite = point.pointType === 'WORKSITE' || !!point.worksiteId;
      const isStop = point.pointType === 'STOP' || (point.stopDurationMinutes && point.stopDurationMinutes >= minStopMinutes);

      let customIcon: L.DivIcon;

      if (isStart) {
        // Green Start Pin
        customIcon = L.divIcon({
          className: 'custom-gps-pin',
          html: `
            <div style="background-color: #16a34a; color: white; border: 2px solid white; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3); border-radius: 9999px; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 11px;">
              SAÍDA
            </div>
          `,
          iconSize: [34, 34],
          iconAnchor: [17, 17],
        });
      } else if (isEnd) {
        // Red End Pin
        customIcon = L.divIcon({
          className: 'custom-gps-pin',
          html: `
            <div style="background-color: #dc2626; color: white; border: 2px solid white; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3); border-radius: 9999px; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 11px;">
              FIM
            </div>
          `,
          iconSize: [34, 34],
          iconAnchor: [17, 17],
        });
      } else if (isWorksite) {
        // Amber Worksite Stop Pin
        customIcon = L.divIcon({
          className: 'custom-gps-pin',
          html: `
            <div style="background-color: #d97706; color: white; border: 2px solid white; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3); border-radius: 8px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 14px;">
              🚧
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });
      } else if (isStop) {
        // Purple Stop Pin
        customIcon = L.divIcon({
          className: 'custom-gps-pin',
          html: `
            <div style="background-color: #9333ea; color: white; border: 2px solid white; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3); border-radius: 9999px; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 12px;">
              ⏸
            </div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });
      } else {
        // Small Blue Breadcrumb Dot
        customIcon = L.divIcon({
          className: 'custom-gps-dot',
          html: `
            <div style="background-color: #3b82f6; border: 1.5px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.3); border-radius: 9999px; width: 14px; height: 14px; display: flex; align-items: center; justify-content: center; color: white; font-size: 8px; font-weight: bold;">
              ${index + 1}
            </div>
          `,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });
      }

      const marker = L.marker([point.latitude, point.longitude], { icon: customIcon });

      // Popup Content for Point
      const popupContent = `
        <div style="font-family: system-ui, sans-serif; min-width: 220px; padding: 4px;">
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 6px;">
            <strong style="color: #0f172a; font-size: 13px;">Ponto #${index + 1} &bull; ${point.timeFormatted}</strong>
            <span style="font-size: 10px; background: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 4px; font-weight: bold;">
              ${point.pointType}
            </span>
          </div>
          <p style="margin: 0 0 4px 0; font-size: 11px; color: #475569;">
            <strong>Chefe:</strong> ${point.userName} (${point.teamName || 'Equipe'})
          </p>
          ${
            point.worksiteName
              ? `<p style="margin: 0 0 4px 0; font-size: 11px; color: #b45309;"><strong>Obra:</strong> ${point.worksiteName}</p>`
              : ''
          }
          ${
            point.addressReference
              ? `<p style="margin: 0 0 4px 0; font-size: 11px; color: #334155;"><strong>Referência:</strong> ${point.addressReference}</p>`
              : ''
          }
          <div style="font-size: 10px; color: #64748b; margin-top: 6px; background: #f8fafc; padding: 4px; border-radius: 4px;">
            <div><strong>Coordenadas:</strong> ${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}</div>
            <div><strong>Precisão:</strong> &plusmn;${point.accuracy.toFixed(1)} m | <strong>Velocidade:</strong> ${point.speed ? `${point.speed} km/h` : '0 km/h'}</div>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);
      marker.on('click', () => {
        setSelectedPoint(point);
      });

      layerGroup.addLayer(marker);
    });

    // Fit map bounds to encompass all trajectory coordinates with generous padding
    const bounds = L.latLngBounds(latLngs);
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
  }, [trajectoryData, activeTab, minStopMinutes]);

  // Center on specific point
  const handleFocusPoint = (point: GpsPoint) => {
    setSelectedPoint(point);
    setActiveTab('MAP');
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([point.latitude, point.longitude], 16, { animate: true });
    }
  };

  // Center on Latest Point
  const handleFocusLatestPoint = () => {
    if (trajectoryData.points.length > 0) {
      const latest = trajectoryData.points[trajectoryData.points.length - 1];
      handleFocusPoint(latest);
    }
  };

  // Manual GPS Ping (Field Leader)
  const handleRegisterManualPing = async () => {
    if (!currentUser) return;
    setRefreshing(true);
    setTrackingFeedback('Solicitando coordenadas do sensor GPS do aparelho...');

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setTrackingFeedback('Geolocalização não suportada neste aparelho.');
      setRefreshing(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy, speed } = pos.coords;
        const now = new Date();
        const newPoint: GpsPoint = {
          id: `gps-manual-${Date.now()}`,
          userId: currentUser.id,
          userName: currentUser.name,
          userRole: currentUser.role,
          teamId: currentUser.teamId || selectedTeamId || 'team-field',
          teamName: selectedTeam?.name || `Equipe ${currentUser.name}`,
          date: now.toISOString().split('T')[0],
          timestamp: now.toISOString(),
          timeFormatted: now.toLocaleTimeString('pt-BR', { hour12: false }),
          latitude,
          longitude,
          accuracy: accuracy ? Number(accuracy.toFixed(1)) : 5.0,
          speed: speed ? Number((speed * 3.6).toFixed(1)) : 0,
          pointType: 'INTERMEDIATE',
          addressReference: 'Localização manual enviada pelo Chefe de Equipe',
          source: 'DEVICE_GPS',
          synced: true,
        };

        try {
          const res = await sendGpsTrack(newPoint);
          if (res.success) {
            setTrackingFeedback(`Ponto registrado com sucesso! Precisão: ±${accuracy.toFixed(1)}m`);
            await loadTrajectoryData();
          } else {
            setTrackingFeedback('Erro ao sincronizar ponto no servidor.');
          }
        } catch {
          setTrackingFeedback('Erro ao enviar ponto GPS.');
        } finally {
          setRefreshing(false);
        }
      },
      (err) => {
        setTrackingFeedback(`Falha ao obter GPS: ${err.message}`);
        setRefreshing(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  // Export CSV
  const handleExportCsv = () => {
    const header = 'Ponto;Horario;Latitude;Longitude;Precisao(m);Velocidade(km/h);Tipo;Obra/Referencia;Chefe;Equipe\n';
    const rows = (trajectoryData.points || []).map((p, idx) => {
      return `${idx + 1};${p.timeFormatted};${p.latitude};${p.longitude};${p.accuracy};${p.speed || 0};${p.pointType};"${p.worksiteName || p.addressReference || ''}";"${p.userName}";"${p.teamName}"`;
    }).join('\n');

    const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `trajeto-real-${selectedUser?.name || 'equipe'}-${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5" id="page-rotas-das-equipes">
      {/* Top Title & Quick Actions */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30">
              <Navigation className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                <span>Rotas das Equipes</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-md">
                  Trajeto Real GPS
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Registro cronológico do deslocamento real dos Chefes de Equipe em campo
              </p>
            </div>
          </div>
        </div>

        {/* Global Toolbar Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {isLeader && (
            <button
              onClick={handleRegisterManualPing}
              id="btn-register-current-gps-point"
              disabled={refreshing}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center space-x-1.5"
            >
              <LocateFixed className="w-4 h-4" />
              <span>Registrar Ponto GPS Agora</span>
            </button>
          )}

          <button
            onClick={handleExportCsv}
            id="btn-export-gps-csv"
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-colors border border-slate-700 flex items-center space-x-1.5"
            title="Exportar coordenadas reais em planilha CSV"
          >
            <Download className="w-4 h-4" />
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={loadTrajectoryData}
            id="btn-refresh-routes"
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-colors border border-slate-700"
            title="Atualizar dados de GPS"
          >
            <RefreshCw className={`w-4 h-4 ${loading || refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Field Leader Active Tracking Widget */}
      <GpsTrackingStatusWidget />

      {/* Tracking Feedback Toast */}
      {trackingFeedback && (
        <div className="bg-blue-50 border border-blue-200 text-blue-900 px-4 py-2.5 rounded-xl text-xs font-medium flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-2">
            <Radio className="w-4 h-4 text-blue-600 animate-pulse" />
            <span>{trackingFeedback}</span>
          </div>
          <button onClick={() => setTrackingFeedback(null)} className="text-blue-500 hover:text-blue-800 font-bold">
            &times;
          </button>
        </div>
      )}

      {/* Filters Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* Date Picker */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>Data do Trajeto</span>
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="date"
                id="filter-route-date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setSelectedDate(todayStr)}
                className="px-2.5 py-2 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors shrink-0"
              >
                Hoje
              </button>
            </div>
          </div>

          {/* Leader (Chefe de Equipe) Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center space-x-1">
              <HardHat className="w-3.5 h-3.5 text-blue-600" />
              <span>Chefe de Equipe</span>
            </label>
            <select
              id="filter-route-leader"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              {fieldLeaders.map((leader) => {
                const latestInfo = latestLocations.find((l) => l.userId === leader.id);
                return (
                  <option key={leader.id} value={leader.id}>
                    {leader.name} {latestInfo?.isOnline ? '🟢 (Ativo)' : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Team Filter */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center space-x-1">
              <Users className="w-3.5 h-3.5 text-blue-600" />
              <span>Equipe Operacional</span>
            </label>
            <select
              id="filter-route-team"
              value={selectedTeamId}
              onChange={(e) => {
                const tId = e.target.value;
                setSelectedTeamId(tId);
                const matchedTeam = teams.find((t) => t.id === tId);
                if (matchedTeam && matchedTeam.leaderId) {
                  setSelectedUserId(matchedTeam.leaderId);
                }
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas as Equipes / Pelo Chefe</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.leaderName})
                </option>
              ))}
            </select>
          </div>

          {/* Stop Duration Threshold (Configurável: 15 min padrão) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center space-x-1">
              <Coffee className="w-3.5 h-3.5 text-purple-600" />
              <span>Critério Mínimo de Parada</span>
            </label>
            <select
              id="filter-min-stop-duration"
              value={minStopMinutes}
              onChange={(e) => setMinStopMinutes(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value={5}>5 minutos</option>
              <option value={10}>10 minutos</option>
              <option value={15}>15 minutos (Padrão)</option>
              <option value={30}>30 minutos</option>
              <option value={45}>45 minutos</option>
              <option value={60}>60 minutos (1 hora)</option>
            </select>
          </div>

          {/* Quick Filter by Type */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center space-x-1">
              <Filter className="w-3.5 h-3.5 text-blue-600" />
              <span>Filtro de Pontos</span>
            </label>
            <select
              id="filter-point-type"
              value={filterPointType}
              onChange={(e) => setFilterPointType(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Todos os Pontos ({rawPoints.length})</option>
              <option value="WORKSITE">Somente Obras Visitadas</option>
              <option value="STOP">Somente Paradas Detectadas</option>
              <option value="START">Início e Fim</option>
            </select>
          </div>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Real Distance */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
            <span>Distância Real</span>
            <Navigation className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="mt-1.5 flex items-baseline space-x-1">
            <span className="text-xl font-black text-slate-900">{trajectoryData.totalDistanceKm}</span>
            <span className="text-xs font-bold text-slate-500">km</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Soma direta dos pontos GPS</p>
        </div>

        {/* Start / End Time */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
            <span>Horário de Atividade</span>
            <Clock className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="mt-1.5 text-xs sm:text-sm font-bold text-slate-900">
            {trajectoryData.startTime || '--:--'} &rarr; {trajectoryData.endTime || '--:--'}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Duração: {trajectoryData.totalDurationFormatted || '0h'}</p>
        </div>

        {/* GPS Points Count */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
            <span>Pontos Coletados</span>
            <MapPin className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <div className="mt-1.5 flex items-baseline space-x-1">
            <span className="text-xl font-black text-indigo-700">{trajectoryData.totalPoints}</span>
            <span className="text-xs font-semibold text-slate-500">registros</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Sem interpolação artificial</p>
        </div>

        {/* Visited Worksites */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
            <span>Obras no Trajeto</span>
            <Building2 className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="mt-1.5 flex items-baseline space-x-1">
            <span className="text-xl font-black text-amber-600">{trajectoryData.visitedWorksites.length}</span>
            <span className="text-xs font-semibold text-slate-500">canteiro(s)</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Com permanência comprovada</p>
        </div>

        {/* Stops Detected */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
            <span>Paradas Detectadas</span>
            <Coffee className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <div className="mt-1.5 flex items-baseline space-x-1">
            <span className="text-xl font-black text-purple-600">{trajectoryData.stops.length}</span>
            <span className="text-xs font-semibold text-slate-500">parada(s)</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">&ge; {minStopMinutes} min parado</p>
        </div>

        {/* Device Status */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
            <span>Status do Aparelho</span>
            <Radio className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="mt-1.5 text-xs font-bold text-slate-900 truncate">
            {selectedUser?.name || 'Chefe'}
          </div>
          <p className="text-[10px] text-emerald-600 font-bold mt-0.5 flex items-center">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block mr-1"></span>
            GPS Autorizado
          </p>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('MAP')}
          id="tab-view-map"
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition ${
            activeTab === 'MAP'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>Mapa do Trajeto Real</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('TIMELINE')}
          id="tab-view-timeline"
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition ${
            activeTab === 'TIMELINE'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Linha do Tempo Cronológica</span>
          <span className="text-[10px] px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded-full font-mono">
            {trajectoryData.timelineEvents?.length || 0}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('TABLE')}
          id="tab-view-table"
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition ${
            activeTab === 'TABLE'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <TableIcon className="w-4 h-4" />
          <span>Coordenadas de Satélite</span>
          <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded-full font-mono">
            {trajectoryData.points.length}
          </span>
        </button>
      </div>

      {/* VIEW 1: MAP VIEW */}
      {activeTab === 'MAP' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Map Container (2 cols) */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col h-[580px]">
            {/* Map Header & Legend */}
            <div className="p-3.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-2 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                  <MapPin className="w-4 h-4 text-blue-400" />
                  <span>Trajeto Real: {selectedUser?.name || 'Chefe de Equipe'}</span>
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  ({selectedDate.split('-').reverse().join('/')})
                </span>
              </div>

              {/* Map Legend & Focus Latest button */}
              <div className="flex items-center space-x-3 text-[10px] font-medium text-slate-300">
                <span className="flex items-center space-x-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                  <span>Saída</span>
                </span>
                <span className="flex items-center space-x-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span>
                  <span>Fim / Atual</span>
                </span>
                <span className="flex items-center space-x-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block"></span>
                  <span>Obra</span>
                </span>
                <span className="flex items-center space-x-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block"></span>
                  <span>Parada</span>
                </span>

                <button
                  type="button"
                  onClick={handleFocusLatestPoint}
                  id="btn-focus-latest-gps-location"
                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-bold transition flex items-center space-x-1 shadow-2xs"
                  title="Centralizar mapa na última localização registrada"
                >
                  <LocateFixed className="w-3 h-3" />
                  <span>Última Localização</span>
                </button>
              </div>
            </div>

            {/* Leaflet Map DOM Element */}
            <div className="relative flex-1 w-full bg-slate-100">
              <div ref={mapContainerRef} className="w-full h-full z-10" />

              {/* Insufficient Points Warning Overlay */}
              {!trajectoryData.hasEnoughData && !loading && (
                <div className="absolute inset-0 bg-slate-950/70 z-20 flex flex-col items-center justify-center p-6 text-center backdrop-blur-xs">
                  <AlertCircle className="w-10 h-10 text-amber-400 mb-2" />
                  <h3 className="text-base font-bold text-white">Não há dados de localização suficientes para representar este trecho</h3>
                  <p className="text-xs text-slate-300 max-w-md mt-1">
                    O Chefe de Equipe precisa estar logado com autorização de localização ativada para que os pontos GPS sejam gravados continuamente.
                  </p>
                  {isLeader && (
                    <button
                      onClick={handleRegisterManualPing}
                      className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
                    >
                      Registrar Ponto GPS Agora
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Chronological Breadcrumb Points Feed (1 col) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col h-[580px] overflow-hidden">
            {/* Feed Header */}
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                  <Activity className="w-4 h-4 text-blue-600" />
                  <span>Trilha Cronológica de Pontos</span>
                </h3>
                <p className="text-[10px] text-slate-500">
                  {displayedPoints.length} de {trajectoryData.totalPoints} pontos exibidos
                </p>
              </div>

              <button
                onClick={() => {
                  if (mapInstanceRef.current && trajectoryData.points.length > 0) {
                    const latLngs = trajectoryData.points.map((p) => [p.latitude, p.longitude] as [number, number]);
                    mapInstanceRef.current.fitBounds(L.latLngBounds(latLngs), { padding: [40, 40] });
                  }
                }}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-800"
              >
                Enquadrar Todos
              </button>
            </div>

            {/* List of Points */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
              {displayedPoints.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  Nenhum ponto registrado para esta data e filtros.
                </div>
              ) : (
                displayedPoints.map((point, index) => {
                  const isSelected = selectedPoint?.id === point.id;
                  const isFirst = index === 0;
                  const isLast = index === displayedPoints.length - 1;
                  const isWorksite = point.pointType === 'WORKSITE' || !!point.worksiteId;
                  const isStop = point.pointType === 'STOP' || (point.stopDurationMinutes && point.stopDurationMinutes >= minStopMinutes);

                  return (
                    <div
                      key={point.id || index}
                      id={`point-item-${point.id}`}
                      onClick={() => handleFocusPoint(point)}
                      className={`p-2.5 rounded-xl transition-all cursor-pointer text-xs ${
                        isSelected
                          ? 'bg-blue-50 border border-blue-300 shadow-xs'
                          : 'hover:bg-slate-50 border border-transparent'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2">
                          {isFirst ? (
                            <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-black text-[9px] flex items-center justify-center">
                              INI
                            </span>
                          ) : isLast ? (
                            <span className="w-5 h-5 rounded-full bg-red-100 text-red-700 font-black text-[9px] flex items-center justify-center">
                              FIM
                            </span>
                          ) : isWorksite ? (
                            <span className="w-5 h-5 rounded-md bg-amber-100 text-amber-700 font-bold text-[10px] flex items-center justify-center">
                              🚧
                            </span>
                          ) : isStop ? (
                            <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 font-bold text-[9px] flex items-center justify-center">
                              ⏸
                            </span>
                          ) : (
                            <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px] flex items-center justify-center">
                              #{index + 1}
                            </span>
                          )}

                          <span className="font-bold text-slate-900 text-xs">
                            {point.timeFormatted}
                          </span>

                          {isWorksite && (
                            <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[9px] font-bold rounded">
                              OBRA
                            </span>
                          )}

                          {isStop && (
                            <span className="px-1.5 py-0.2 bg-purple-100 text-purple-800 text-[9px] font-bold rounded">
                              {point.stopDurationMinutes || minStopMinutes} min
                            </span>
                          )}
                        </div>

                        <div className="text-[10px] text-slate-400 font-mono">
                          ±{point.accuracy.toFixed(0)}m
                        </div>
                      </div>

                      <div className="mt-1 text-slate-700 font-medium text-[11px] leading-tight">
                        {point.addressReference || point.worksiteName || `Coordenadas: ${point.latitude.toFixed(4)}, ${point.longitude.toFixed(4)}`}
                      </div>

                      {point.notes && (
                        <p className="mt-1 text-[10px] text-slate-500 italic bg-white/80 p-1 rounded border border-slate-100">
                          "{point.notes}"
                        </p>
                      )}

                      <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400">
                        <span>Vel: {point.speed ? `${Math.round(point.speed)} km/h` : 'Parado'}</span>
                        <span className="text-blue-600 font-semibold hover:underline">Ver no mapa &rarr;</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: TIMELINE VIEW */}
      {activeTab === 'TIMELINE' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between border-b pb-3 mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>Linha do Tempo Cronológica do Deslocamento</span>
              </h3>
              <p className="text-xs text-slate-500">
                Sequência cronológica automática gerada a partir dos pontos reais de GPS
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-lg">
              Critério de Parada: &ge; {minStopMinutes} min
            </span>
          </div>

          {trajectoryData.timelineEvents && trajectoryData.timelineEvents.length > 0 ? (
            <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
              {trajectoryData.timelineEvents.map((evt, idx) => {
                let badgeBg = 'bg-blue-600 text-white';
                let icon = <Navigation className="w-3.5 h-3.5" />;

                if (evt.type === 'DEPARTURE') {
                  badgeBg = 'bg-emerald-600 text-white';
                  icon = <CheckCircle2 className="w-3.5 h-3.5" />;
                } else if (evt.type === 'ARRIVAL') {
                  badgeBg = 'bg-amber-600 text-white';
                  icon = <Building2 className="w-3.5 h-3.5" />;
                } else if (evt.type === 'STAY') {
                  badgeBg = 'bg-purple-600 text-white';
                  icon = <Coffee className="w-3.5 h-3.5" />;
                } else if (evt.type === 'DEPARTURE_STOP') {
                  badgeBg = 'bg-indigo-600 text-white';
                  icon = <ArrowRight className="w-3.5 h-3.5" />;
                } else if (evt.type === 'RETURN_BASE') {
                  badgeBg = 'bg-red-600 text-white';
                  icon = <CheckCircle2 className="w-3.5 h-3.5" />;
                }

                return (
                  <div key={evt.id || idx} className="relative group">
                    {/* Circle badge */}
                    <div
                      className={`absolute -left-6 sm:-left-8 top-0.5 w-6 h-6 rounded-full ${badgeBg} flex items-center justify-center shadow-xs text-xs ring-4 ring-white`}
                    >
                      {icon}
                    </div>

                    <div className="bg-slate-50 hover:bg-slate-100/80 transition p-4 rounded-xl border border-slate-200">
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          {evt.time} {evt.endTime ? `às ${evt.endTime}` : ''}
                        </span>

                        {evt.durationFormatted && (
                          <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                            Permanência: {evt.durationFormatted}
                          </span>
                        )}

                        {evt.distanceKm && (
                          <span className="text-xs font-bold text-slate-700 bg-slate-200/60 px-2 py-0.5 rounded">
                            {evt.distanceKm.toFixed(1)} km percorridos
                          </span>
                        )}
                      </div>

                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 mt-1.5">{evt.title}</h4>
                      <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{evt.description}</p>

                      {evt.latitude && evt.longitude && (
                        <div className="mt-2 text-[10px] text-slate-400 font-mono flex items-center space-x-2">
                          <span>Coord: {evt.latitude.toFixed(5)}, {evt.longitude.toFixed(5)}</span>
                          <button
                            onClick={() => {
                              setActiveTab('MAP');
                              setTimeout(() => {
                                if (mapInstanceRef.current && evt.latitude && evt.longitude) {
                                  mapInstanceRef.current.setView([evt.latitude, evt.longitude], 16, { animate: true });
                                }
                              }, 100);
                            }}
                            className="text-blue-600 font-bold hover:underline"
                          >
                            Ver no mapa &rarr;
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400 text-xs">
              Nenhum evento registrado nesta data.
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: TABLE VIEW */}
      {activeTab === 'TABLE' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 flex items-center space-x-2">
              <TableIcon className="w-4 h-4 text-blue-600" />
              <span>Coordenadas de Satélite & Trilha de Auditoria</span>
            </h3>
            <button
              onClick={handleExportCsv}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center space-x-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar Planilha</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 text-slate-900 text-[11px] uppercase font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">Horário</th>
                  <th className="p-3">Latitude</th>
                  <th className="p-3">Longitude</th>
                  <th className="p-3">Precisão</th>
                  <th className="p-3">Velocidade</th>
                  <th className="p-3">Tipo</th>
                  <th className="p-3">Referência / Canteiro</th>
                  <th className="p-3">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {trajectoryData.points.map((p, idx) => (
                  <tr key={p.id || idx} className="hover:bg-slate-50 transition">
                    <td className="p-3 font-bold text-slate-900">{idx + 1}</td>
                    <td className="p-3 font-bold text-blue-700">{p.timeFormatted}</td>
                    <td className="p-3">{p.latitude.toFixed(6)}</td>
                    <td className="p-3">{p.longitude.toFixed(6)}</td>
                    <td className="p-3 text-slate-500">±{p.accuracy.toFixed(1)} m</td>
                    <td className="p-3">{p.speed ? `${p.speed} km/h` : '0 km/h'}</td>
                    <td className="p-3 font-sans">
                      <span className="px-1.5 py-0.5 bg-slate-100 text-slate-800 text-[10px] font-bold rounded">
                        {p.pointType}
                      </span>
                    </td>
                    <td className="p-3 font-sans text-slate-800 font-medium">
                      {p.worksiteName || p.addressReference || '—'}
                    </td>
                    <td className="p-3 font-sans">
                      <button
                        onClick={() => handleFocusPoint(p)}
                        className="text-blue-600 font-bold hover:underline text-[11px]"
                      >
                        Ver no mapa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Visited Worksites and Stops Detailed Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Visited Worksites Table */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between border-b pb-2.5 border-slate-100 mb-3">
            <h3 className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
              <Building2 className="w-4 h-4 text-amber-600" />
              <span>Obras Visitadas no Dia ({trajectoryData.visitedWorksites.length})</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-medium">Permanência &ge; {minStopMinutes} min</span>
          </div>

          {trajectoryData.visitedWorksites.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">
              Nenhuma obra com ponto GPS correspondente neste dia.
            </p>
          ) : (
            <div className="space-y-2.5">
              {trajectoryData.visitedWorksites.map((ws, i) => (
                <div
                  key={ws.worksiteId || i}
                  className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl flex items-start justify-between"
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="px-1.5 py-0.5 bg-amber-600 text-white text-[9px] font-black rounded uppercase">
                        Obra #{i + 1}
                      </span>
                      <h4 className="text-xs font-bold text-slate-900">{ws.worksiteName}</h4>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1">
                      Horário no canteiro: <strong>{ws.arrivalTime}</strong> &rarr; <strong>{ws.departureTime}</strong> ({ws.durationMinutes} min de permanência)
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {ws.pointsCount} pontos GPS registrados dentro do perímetro da obra.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setActiveTab('MAP');
                      setTimeout(() => {
                        if (mapInstanceRef.current) {
                          mapInstanceRef.current.setView([ws.latitude, ws.longitude], 15, { animate: true });
                        }
                      }, 100);
                    }}
                    className="p-1.5 bg-white border border-amber-300 rounded-lg text-amber-800 hover:bg-amber-100 text-xs font-bold shrink-0"
                    title="Centralizar obra no mapa"
                  >
                    <LocateFixed className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stops & Detours Table */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between border-b pb-2.5 border-slate-100 mb-3">
            <h3 className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
              <Coffee className="w-4 h-4 text-purple-600" />
              <span>Paradas & Desvios ({trajectoryData.stops.length})</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-medium">Critério &ge; {minStopMinutes} minutos</span>
          </div>

          {trajectoryData.stops.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">
              Nenhuma parada longa detectada além das obras.
            </p>
          ) : (
            <div className="space-y-2.5">
              {trajectoryData.stops.map((stop, i) => (
                <div
                  key={stop.id || i}
                  className="p-3 bg-purple-50/60 border border-purple-200 rounded-xl flex items-start justify-between"
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="px-1.5 py-0.5 bg-purple-600 text-white text-[9px] font-black rounded uppercase">
                        {stop.durationMinutes} MINUTOS
                      </span>
                      <h4 className="text-xs font-bold text-slate-900">{stop.addressReference || 'Parada Comercial / Almoço'}</h4>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1">
                      Horário: <strong>{stop.startTime}</strong> até <strong>{stop.endTime}</strong>
                    </p>
                    {stop.notes && (
                      <p className="text-[10px] text-purple-800 font-medium mt-0.5">
                        Observação: "{stop.notes}"
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      setActiveTab('MAP');
                      setTimeout(() => {
                        if (mapInstanceRef.current) {
                          mapInstanceRef.current.setView([stop.latitude, stop.longitude], 16, { animate: true });
                        }
                      }, 100);
                    }}
                    className="p-1.5 bg-white border border-purple-300 rounded-lg text-purple-800 hover:bg-purple-100 text-xs font-bold shrink-0"
                    title="Centralizar parada no mapa"
                  >
                    <LocateFixed className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Field Leaders Real-Time Fleet Overview */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between border-b pb-2.5 border-slate-100 mb-3">
          <h3 className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
            <Radio className="w-4 h-4 text-emerald-600 animate-pulse" />
            <span>Última Posição dos Chefes de Equipe em Campo</span>
          </h3>
          <span className="text-[10px] text-slate-400 font-medium">Status dos dispositivos hoje</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {latestLocations.map((item) => {
            const isCurrentSelected = item.userId === selectedUserId;
            return (
              <div
                key={item.userId}
                onClick={() => {
                  setSelectedUserId(item.userId);
                  if (item.teamId) setSelectedTeamId(item.teamId);
                }}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  isCurrentSelected
                    ? 'bg-blue-50 border-blue-400 shadow-xs'
                    : 'bg-slate-50 border-slate-200 hover:border-blue-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-xs">{item.userName}</span>
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      item.isOnline ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'
                    }`}
                  ></span>
                </div>

                <p className="text-[11px] text-slate-600 font-medium mt-0.5">{item.teamName}</p>

                <div className="mt-2.5 text-[10px] flex items-center justify-between text-slate-500 border-t border-slate-200/60 pt-1.5">
                  <span className={item.isOnline ? 'text-emerald-700 font-bold' : 'text-slate-500'}>
                    {item.statusLabel}
                  </span>
                  {item.lastPoint && (
                    <span className="font-mono text-[9px] text-slate-400">{item.lastPoint.timeFormatted}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
