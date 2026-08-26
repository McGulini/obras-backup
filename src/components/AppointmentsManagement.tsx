import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  Plus,
  Search,
  Filter,
  Users,
  Building2,
  MapPin,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Trash2,
  ArrowRight,
  HardHat,
  Truck,
  Eye,
  X,
  FileText,
  AlertCircle,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Appointment, AppointmentStatus, STANDARD_SERVICES, DailyLog } from '../types';

interface AppointmentsManagementProps {
  onOpenNewRDOWithAppointment?: (appointment: Appointment) => void;
  onNavigateTab?: (tab: string) => void;
}

export const AppointmentsManagement: React.FC<AppointmentsManagementProps> = ({
  onOpenNewRDOWithAppointment,
  onNavigateTab,
}) => {
  const {
    appointments = [],
    teams = [],
    helpers = [],
    worksites = [],
    addAppointment,
    editAppointment,
    removeAppointment,
    changeAppointmentStatus,
    checkConflicts,
  } = useData();
  const { currentUser, isAdmin } = useAuth();

  // Active View Mode
  const [viewMode, setViewMode] = useState<'CALENDAR' | 'TIMELINE' | 'TABLE'>('CALENDAR');
  const [calendarSubMode, setCalendarSubMode] = useState<'MONTH' | 'WEEK' | 'DAY'>('MONTH');

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTeamId, setFilterTeamId] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterCity, setFilterCity] = useState('ALL');
  const [filterHelperId, setFilterHelperId] = useState('ALL');
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [timelineSelectedTeam, setTimelineSelectedTeam] = useState<string>(teams[0]?.id || '');

  // Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [detailAppointment, setDetailAppointment] = useState<Appointment | null>(null);
  const [appointmentToDelete, setAppointmentToDelete] = useState<Appointment | null>(null);
  const [isDeletingAppointment, setIsDeletingAppointment] = useState(false);
  const [toastFeedback, setToastFeedback] = useState<{
    type: 'success' | 'error' | 'warning';
    message: string;
  } | null>(null);

  // Form Fields State
  const [formData, setFormData] = useState<{
    worksiteId: string;
    worksiteName: string;
    city: string;
    state: string;
    address: string;
    teamId: string;
    teamName: string;
    leaderName: string;
    helperIds: string[];
    startDate: string;
    endDate: string;
    startTime: string;
    endTime: string;
    services: string[];
    status: AppointmentStatus;
    notes: string;
    nextDestinationCity: string;
    nextDestinationState: string;
    nextDestinationWorksite: string;
    nextDestinationDate: string;
    nextDestinationService: string;
    nextAppointmentId: string;
  }>({
    worksiteId: '',
    worksiteName: '',
    city: '',
    state: 'PR',
    address: '',
    teamId: '',
    teamName: '',
    leaderName: '',
    helperIds: [],
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    startTime: '08:00',
    endTime: '17:00',
    services: [STANDARD_SERVICES[0]],
    status: 'PLANEJADO',
    notes: '',
    nextDestinationCity: '',
    nextDestinationState: 'PR',
    nextDestinationWorksite: '',
    nextDestinationDate: '',
    nextDestinationService: '',
    nextAppointmentId: '',
  });

  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [formConflicts, setFormConflicts] = useState<ReturnType<typeof checkConflicts>>([]);
  const [forceOverride, setForceOverride] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Extract unique cities from worksites and appointments
  const uniqueCities = useMemo(() => {
    const set = new Set<string>();
    worksites.forEach((w) => {
      if (w.city) set.add(w.city);
    });
    appointments.forEach((a) => {
      if (a.city) set.add(a.city);
    });
    return Array.from(set).sort();
  }, [worksites, appointments]);

  // Key stats
  const todayStr = new Date().toISOString().split('T')[0];
  const stats = useMemo(() => {
    const todayActive = appointments.filter(
      (a) => a.startDate <= todayStr && a.endDate >= todayStr && a.status !== 'CANCELADO'
    );
    const inTransit = appointments.filter(
      (a) => a.status === 'CONFIRMADO' && a.startDate > todayStr
    );
    const finishingToday = appointments.filter(
      (a) => a.endDate === todayStr && a.status !== 'CONCLUIDO' && a.status !== 'CANCELADO'
    );
    const planned = appointments.filter((a) => a.status === 'PLANEJADO');
    return {
      activeCount: todayActive.length,
      inTransitCount: inTransit.length,
      finishingTodayCount: finishingToday.length,
      plannedCount: planned.length,
      totalCount: appointments.length,
    };
  }, [appointments, todayStr]);

  // Filtered Appointments
  const filteredAppointments = useMemo(() => {
    return appointments.filter((a) => {
      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matches =
          a.worksiteName.toLowerCase().includes(term) ||
          a.city.toLowerCase().includes(term) ||
          a.teamName.toLowerCase().includes(term) ||
          a.leaderName.toLowerCase().includes(term) ||
          a.services.some((s) => s.toLowerCase().includes(term));
        if (!matches) return false;
      }
      // Team
      if (filterTeamId !== 'ALL' && a.teamId !== filterTeamId) return false;
      // Status
      if (filterStatus !== 'ALL' && a.status !== filterStatus) return false;
      // City
      if (filterCity !== 'ALL' && a.city !== filterCity) return false;
      // Helper
      if (filterHelperId !== 'ALL' && !(a.helperIds || []).includes(filterHelperId)) return false;

      return true;
    });
  }, [appointments, searchTerm, filterTeamId, filterStatus, filterCity, filterHelperId]);

  // Handle open create form
  const handleOpenCreate = (presetDate?: string, presetTeamId?: string) => {
    const firstTeam = teams.find((t) => (presetTeamId ? t.id === presetTeamId : true)) || teams[0];
    const initialHelpers = firstTeam ? (firstTeam.defaultHelperIds || []) : [];
    const firstWorksite = worksites[0];

    const d = presetDate || new Date().toISOString().split('T')[0];

    setFormData({
      worksiteId: firstWorksite ? firstWorksite.id : '',
      worksiteName: firstWorksite ? firstWorksite.name : '',
      city: firstWorksite ? firstWorksite.city : 'Curitiba',
      state: firstWorksite ? firstWorksite.state : 'PR',
      address: firstWorksite ? firstWorksite.address : '',
      teamId: firstTeam ? firstTeam.id : '',
      teamName: firstTeam ? firstTeam.name : '',
      leaderName: firstTeam ? firstTeam.leaderName : '',
      helperIds: initialHelpers,
      startDate: d,
      endDate: d,
      startTime: '08:00',
      endTime: '17:00',
      services: [STANDARD_SERVICES[0]],
      status: 'PLANEJADO',
      notes: '',
      nextDestinationCity: '',
      nextDestinationState: 'PR',
      nextDestinationWorksite: '',
      nextDestinationDate: '',
      nextDestinationService: '',
      nextAppointmentId: '',
    });

    setEditingAppointment(null);
    setFormConflicts([]);
    setForceOverride(false);
    setFormErrors([]);
    setIsFormOpen(true);
  };

  // Handle open edit form
  const handleOpenEdit = (app: Appointment) => {
    setFormData({
      worksiteId: app.worksiteId || '',
      worksiteName: app.worksiteName,
      city: app.city,
      state: app.state,
      address: app.address || '',
      teamId: app.teamId,
      teamName: app.teamName,
      leaderName: app.leaderName,
      helperIds: app.helperIds || [],
      startDate: app.startDate,
      endDate: app.endDate,
      startTime: app.startTime || '08:00',
      endTime: app.endTime || '17:00',
      services: app.services && app.services.length > 0 ? app.services : [STANDARD_SERVICES[0]],
      status: app.status,
      notes: app.notes || '',
      nextDestinationCity: app.nextDestinationCity || '',
      nextDestinationState: app.nextDestinationState || 'PR',
      nextDestinationWorksite: app.nextDestinationWorksite || '',
      nextDestinationDate: app.nextDestinationDate || '',
      nextDestinationService: app.nextDestinationService || '',
      nextAppointmentId: app.nextAppointmentId || '',
    });

    setEditingAppointment(app);
    setFormConflicts([]);
    setForceOverride(Boolean(app.overrideConflictReason));
    setFormErrors([]);
    setIsFormOpen(true);
  };

  // Team selection changed in form
  const handleFormTeamChange = (teamId: string) => {
    const tm = teams.find((t) => t.id === teamId);
    if (!tm) return;
    setFormData((prev) => ({
      ...prev,
      teamId: tm.id,
      teamName: tm.name,
      leaderName: tm.leaderName,
      helperIds: tm.defaultHelperIds || [],
    }));
    // Re-check conflicts
    checkLiveConflicts({
      ...formData,
      teamId: tm.id,
      teamName: tm.name,
      helperIds: tm.defaultHelperIds || [],
    });
  };

  // Worksite selection changed in form
  const handleFormWorksiteChange = (wsId: string) => {
    if (wsId === 'CUSTOM') {
      setFormData((prev) => ({
        ...prev,
        worksiteId: 'CUSTOM',
        worksiteName: '',
      }));
    } else {
      const ws = worksites.find((w) => w.id === wsId);
      if (ws) {
        setFormData((prev) => ({
          ...prev,
          worksiteId: ws.id,
          worksiteName: ws.name,
          city: ws.city,
          state: ws.state,
          address: ws.address,
        }));
        checkLiveConflicts({
          ...formData,
          worksiteId: ws.id,
          worksiteName: ws.name,
        });
      }
    }
  };

  // Live conflict detection
  const checkLiveConflicts = (dataToTest: typeof formData) => {
    const conflicts = checkConflicts(
      {
        startDate: dataToTest.startDate,
        endDate: dataToTest.endDate,
        teamId: dataToTest.teamId,
        teamName: dataToTest.teamName,
        worksiteId: dataToTest.worksiteId,
        worksiteName: dataToTest.worksiteName,
        helperIds: dataToTest.helperIds,
      },
      editingAppointment ? editingAppointment.id : undefined
    );
    setFormConflicts(conflicts);
  };

  // Helper toggle in form
  const handleToggleHelper = (helperId: string) => {
    const newHelpers = formData.helperIds.includes(helperId)
      ? formData.helperIds.filter((id) => id !== helperId)
      : [...formData.helperIds, helperId];

    setFormData((prev) => ({ ...prev, helperIds: newHelpers }));
    checkLiveConflicts({ ...formData, helperIds: newHelpers });
  };

  // Service toggle in form
  const handleToggleService = (serviceName: string) => {
    const current = formData.services || [];
    const exists = current.includes(serviceName);
    let updated: string[];
    if (exists) {
      if (current.length === 1) return; // Keep at least one
      updated = current.filter((s) => s !== serviceName);
    } else {
      updated = [...current, serviceName];
    }
    setFormData((prev) => ({ ...prev, services: updated }));
  };

  // Form Submit
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: string[] = [];

    if (!formData.worksiteName.trim()) errors.push('Informe o nome da Obra.');
    if (!formData.city.trim()) errors.push('Informe a Cidade.');
    if (!formData.teamId) errors.push('Selecione a Equipe responsável.');
    if (!formData.startDate) errors.push('Informe a Data de Início.');
    if (!formData.endDate) errors.push('Informe a Data de Término.');
    if (formData.startDate > formData.endDate) {
      errors.push('A Data de Início não pode ser posterior à Data de Término.');
    }
    if (!formData.services || formData.services.length === 0) {
      errors.push('Selecione ao menos um serviço.');
    }

    // Check conflicts
    const currentConflicts = checkConflicts(
      {
        startDate: formData.startDate,
        endDate: formData.endDate,
        teamId: formData.teamId,
        teamName: formData.teamName,
        worksiteId: formData.worksiteId,
        worksiteName: formData.worksiteName,
        helperIds: formData.helperIds,
      },
      editingAppointment ? editingAppointment.id : undefined
    );

    const hasCriticalConflict = currentConflicts.some((c) => c.severity === 'CRITICAL');
    if (hasCriticalConflict && !forceOverride) {
      setFormConflicts(currentConflicts);
      errors.push(
        'Existem conflitos críticos de agenda (equipe ou ajudante já escalado no período). Para continuar, selecione a opção de autorização de administrador.'
      );
    }

    if (errors.length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    setFormErrors([]);

    try {
      if (editingAppointment) {
        await editAppointment(
          editingAppointment.id,
          {
            ...formData,
            overrideConflictReason: forceOverride
              ? `Forçado por ${currentUser.name} (${currentUser.role})`
              : undefined,
          },
          forceOverride
        );
      } else {
        await addAppointment(
          {
            ...formData,
            overrideConflictReason: forceOverride
              ? `Forçado por ${currentUser.name} (${currentUser.role})`
              : undefined,
          },
          forceOverride
        );
      }
      setIsFormOpen(false);
    } catch (err: any) {
      setFormErrors([err.message || 'Erro ao salvar agendamento.']);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Prompt Delete Appointment with confirmation modal
  const handlePromptDeleteAppointment = (app: Appointment) => {
    if (!isAdmin) {
      setToastFeedback({
        type: 'warning',
        message: 'Apenas Administradores e Gestores autorizados podem excluir agendamentos de serviços.',
      });
      setTimeout(() => setToastFeedback(null), 4000);
      return;
    }
    setAppointmentToDelete(app);
  };

  // Confirm Delete appointment
  const handleConfirmDeleteAppointment = async () => {
    if (!appointmentToDelete) return;
    setIsDeletingAppointment(true);
    try {
      await removeAppointment(appointmentToDelete.id);
      setToastFeedback({
        type: 'success',
        message: `Serviço "${appointmentToDelete.worksiteName}" (${appointmentToDelete.teamName}) excluído com sucesso da escala.`,
      });
      if (detailAppointment && detailAppointment.id === appointmentToDelete.id) {
        setDetailAppointment(null);
      }
      if (isFormOpen && editingAppointment && editingAppointment.id === appointmentToDelete.id) {
        setIsFormOpen(false);
        setEditingAppointment(null);
      }
      setAppointmentToDelete(null);
      setTimeout(() => setToastFeedback(null), 4000);
    } catch (err: any) {
      console.error('Erro ao excluir serviço:', err);
      setToastFeedback({
        type: 'error',
        message: err.message || 'Não foi possível excluir o serviço. Tente novamente.',
      });
      setTimeout(() => setToastFeedback(null), 5000);
    } finally {
      setIsDeletingAppointment(false);
    }
  };

  // Status Badge Helper
  const getStatusBadge = (status: AppointmentStatus) => {
    switch (status) {
      case 'PLANEJADO':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            🟡 Planejado
          </span>
        );
      case 'CONFIRMADO':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
            🔵 Confirmado
          </span>
        );
      case 'EM_ANDAMENTO':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            🟢 Em Andamento
          </span>
        );
      case 'CONCLUIDO':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
            ✅ Concluído
          </span>
        );
      case 'CANCELADO':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
            🔴 Cancelado
          </span>
        );
      default:
        return null;
    }
  };

  // Calendar Helpers (Month Grid)
  const calendarDays = useMemo(() => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

    const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

    // Preceding days from last month
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = prevMonthLastDay - i;
      const prevDate = new Date(year, month - 1, d);
      days.push({
        dateStr: prevDate.toISOString().split('T')[0],
        dayNum: d,
        isCurrentMonth: false,
      });
    }

    // Days of current month
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const curDate = new Date(year, month, d);
      const m = String(curDate.getMonth() + 1).padStart(2, '0');
      const day = String(d).padStart(2, '0');
      days.push({
        dateStr: `${year}-${m}-${day}`,
        dayNum: d,
        isCurrentMonth: true,
      });
    }

    // Trailing days to fill 35 or 42 grid slots
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const nextDate = new Date(year, month + 1, i);
      days.push({
        dateStr: nextDate.toISOString().split('T')[0],
        dayNum: i,
        isCurrentMonth: false,
      });
    }

    return days;
  }, [selectedMonth]);

  // Selected team's members in form (only active helpers or already selected)
  const currentTeamHelpers = useMemo(() => {
    return helpers.filter((h) => h.active !== false || formData.helperIds.includes(h.id));
  }, [helpers, formData.helperIds]);

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in" id="appointments-management-container">
      {/* Top Back Navigation Bar */}
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => onNavigateTab && onNavigateTab('dashboard')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold shadow-xs transition-colors"
          id="btn-appointments-back-dashboard"
        >
          <ArrowRight className="w-3.5 h-3.5 rotate-180" />
          <span>← Voltar ao Painel</span>
        </button>

        <button
          onClick={() => handleOpenCreate()}
          id="btn-new-appointment"
          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-xs shadow-xs flex items-center space-x-1.5 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Novo Agendamento</span>
        </button>
      </div>

      {/* Toast Feedback Notification */}
      {toastFeedback && (
        <div
          className={`p-3.5 sm:p-4 rounded-xl border flex items-center justify-between text-xs font-bold transition-all shadow-md ${
            toastFeedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : toastFeedback.type === 'warning'
              ? 'bg-amber-50 border-amber-300 text-amber-900'
              : 'bg-rose-50 border-rose-300 text-rose-900'
          }`}
          role="alert"
        >
          <div className="flex items-center space-x-2">
            {toastFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : toastFeedback.type === 'warning' ? (
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{toastFeedback.message}</span>
          </div>
          <button
            onClick={() => setToastFeedback(null)}
            className="text-slate-400 hover:text-slate-700 p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Banner & Quick Stats */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-2 sm:gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 sm:p-2 rounded-lg bg-blue-50 text-blue-600">
              <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            </span>
            <div>
              <h2 className="text-sm sm:text-lg font-bold text-slate-900">
                Planejamento & Escala de Equipes
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500">
                Programe antecipadamente as obras, cidades, equipes, ajudantes e próximos destinos.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Status KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5">
        <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Equipes em Campo Hoje
            </span>
            <span className="text-xl sm:text-2xl font-black text-emerald-600 mt-0.5 block">
              {stats.activeCount}
            </span>
          </div>
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
            <HardHat className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Deslocamento / Confirmados
            </span>
            <span className="text-xl sm:text-2xl font-black text-blue-600 mt-0.5 block">
              {stats.inTransitCount}
            </span>
          </div>
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
            <Truck className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Finalizando Hoje
            </span>
            <span className="text-xl sm:text-2xl font-black text-amber-600 mt-0.5 block">
              {stats.finishingTodayCount}
            </span>
          </div>
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Total de Programações
            </span>
            <span className="text-xl sm:text-2xl font-black text-slate-800 mt-0.5 block">
              {stats.totalCount}
            </span>
          </div>
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold shrink-0">
            <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>
      </div>

      {/* Navigation / View Mode Bar & Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* View Mode Buttons */}
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg self-start">
            <button
              onClick={() => setViewMode('CALENDAR')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all flex items-center space-x-1.5 ${
                viewMode === 'CALENDAR'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Visão Calendário</span>
            </button>
            <button
              onClick={() => setViewMode('TIMELINE')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all flex items-center space-x-1.5 ${
                viewMode === 'TIMELINE'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Linha do Tempo por Equipe</span>
            </button>
            <button
              onClick={() => setViewMode('TABLE')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all flex items-center space-x-1.5 ${
                viewMode === 'TABLE'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Lista / Tabela</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por obra, cidade, equipe ou serviço..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-blue-500 transition-colors"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Dropdown Filters Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100 text-xs">
          {/* Team Filter */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Equipe
            </label>
            <select
              value={filterTeamId}
              onChange={(e) => setFilterTeamId(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:border-blue-500"
            >
              <option value="ALL">Todas as Equipes</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.leaderName})
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:border-blue-500"
            >
              <option value="ALL">Todos os Status</option>
              <option value="PLANEJADO">🟡 Planejado</option>
              <option value="CONFIRMADO">🔵 Confirmado</option>
              <option value="EM_ANDAMENTO">🟢 Em Andamento</option>
              <option value="CONCLUIDO">✅ Concluído</option>
              <option value="CANCELADO">🔴 Cancelado</option>
            </select>
          </div>

          {/* City Filter */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Cidade / Praça
            </label>
            <select
              value={filterCity}
              onChange={(e) => setFilterCity(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:border-blue-500"
            >
              <option value="ALL">Todas as Cidades</option>
              {uniqueCities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>

          {/* Helper Filter */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Ajudante Escalado
            </label>
            <select
              value={filterHelperId}
              onChange={(e) => setFilterHelperId(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:border-blue-500"
            >
              <option value="ALL">Todos os Ajudantes</option>
              {helpers.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} ({h.role})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* VIEW 1: CALENDAR */}
      {viewMode === 'CALENDAR' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Calendar Header with Month Navigation */}
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div className="flex items-center space-x-3">
              <h3 className="text-base font-bold text-slate-800 capitalize">
                {selectedMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </h3>
              <button
                onClick={() => setSelectedMonth(new Date())}
                className="px-2.5 py-1 text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
              >
                Hoje
              </button>
            </div>

            <div className="flex items-center space-x-1">
              <button
                onClick={() =>
                  setSelectedMonth(
                    new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1)
                  )
                }
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 transition-colors"
                title="Mês Anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() =>
                  setSelectedMonth(
                    new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1)
                  )
                }
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 transition-colors"
                title="Próximo Mês"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-100/70 text-[11px] font-bold text-slate-600 text-center py-2">
            <div>Dom</div>
            <div>Seg</div>
            <div>Ter</div>
            <div>Qua</div>
            <div>Qui</div>
            <div>Sex</div>
            <div>Sáb</div>
          </div>

          {/* Month Calendar Grid */}
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
            {calendarDays.map((dayObj, idx) => {
              const dayAppointments = filteredAppointments.filter(
                (a) => a.startDate <= dayObj.dateStr && a.endDate >= dayObj.dateStr
              );
              const isToday = dayObj.dateStr === todayStr;

              return (
                <div
                  key={idx}
                  className={`min-h-[110px] p-2 transition-colors flex flex-col justify-between ${
                    dayObj.isCurrentMonth ? 'bg-white' : 'bg-slate-50/50 text-slate-300'
                  } ${isToday ? 'bg-blue-50/30' : ''}`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center ${
                        isToday
                          ? 'bg-blue-600 text-white font-black shadow-xs'
                          : dayObj.isCurrentMonth
                          ? 'text-slate-700'
                          : 'text-slate-400'
                      }`}
                    >
                      {dayObj.dayNum}
                    </span>
                    {dayObj.isCurrentMonth && (
                      <button
                        onClick={() => handleOpenCreate(dayObj.dateStr)}
                        className="opacity-0 hover:opacity-100 focus:opacity-100 text-slate-400 hover:text-blue-600 p-0.5"
                        title="Agendar para este dia"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Day Appointment Badges */}
                  <div className="space-y-1 overflow-y-auto max-h-[85px] scrollbar-thin">
                    {dayAppointments.map((app) => (
                      <div
                        key={app.id}
                        onClick={() => setDetailAppointment(app)}
                        className={`text-[10px] p-1.5 rounded-md cursor-pointer border truncate transition-all shadow-2xs hover:scale-[1.02] ${
                          app.status === 'EM_ANDAMENTO'
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                            : app.status === 'CONFIRMADO'
                            ? 'bg-blue-50 border-blue-300 text-blue-900 font-medium'
                            : app.status === 'PLANEJADO'
                            ? 'bg-amber-50 border-amber-300 text-amber-900 font-medium'
                            : app.status === 'CONCLUIDO'
                            ? 'bg-slate-100 border-slate-300 text-slate-600 line-through'
                            : 'bg-rose-50 border-rose-200 text-rose-700'
                        }`}
                        title={`${app.teamName} - ${app.worksiteName} (${app.city})`}
                      >
                        <div className="font-bold truncate">{app.teamName}</div>
                        <div className="text-[9px] text-slate-500 truncate flex items-center gap-0.5">
                          <MapPin className="w-2.5 h-2.5 inline" /> {app.city} • {app.worksiteName}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 2: TIMELINE POR EQUIPE */}
      {viewMode === 'TIMELINE' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-6">
          {/* Team Selector for Timeline */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Cronograma de Deslocamentos & Missões por Equipe
              </h3>
              <p className="text-xs text-slate-500">
                Acompanhe o itinerário sequencial de cada equipe (onde estão, quando terminam e para onde vão).
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-600">Equipe:</span>
              <select
                value={timelineSelectedTeam}
                onChange={(e) => setTimelineSelectedTeam(e.target.value)}
                className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
              >
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} (Líder: {t.leaderName})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Timeline Cards */}
          {(() => {
            const teamApps = appointments
              .filter((a) => a.teamId === timelineSelectedTeam)
              .sort((a, b) => a.startDate.localeCompare(b.startDate));

            if (teamApps.length === 0) {
              return (
                <div className="text-center py-12 text-slate-400">
                  <Truck className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm font-medium">Nenhum agendamento programado para esta equipe.</p>
                  <button
                    onClick={() => handleOpenCreate(undefined, timelineSelectedTeam)}
                    className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-500"
                  >
                    Agendar Primeiro Serviço
                  </button>
                </div>
              );
            }

            return (
              <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-blue-200">
                {teamApps.map((app, index) => {
                  const isCurrent = app.startDate <= todayStr && app.endDate >= todayStr;
                  const isFuture = app.startDate > todayStr;
                  const isPast = app.endDate < todayStr;

                  return (
                    <div key={app.id} className="relative group">
                      {/* Timeline Dot */}
                      <div
                        className={`absolute -left-6 sm:-left-8 top-3 w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-black z-10 transition-all ${
                          isCurrent
                            ? 'bg-emerald-500 border-white text-white shadow-md ring-4 ring-emerald-100 scale-110'
                            : isFuture
                            ? 'bg-blue-500 border-white text-white shadow-xs'
                            : 'bg-slate-300 border-white text-slate-700'
                        }`}
                      >
                        {index + 1}
                      </div>

                      {/* Card Content */}
                      <div
                        className={`p-4 sm:p-5 rounded-xl border transition-all ${
                          isCurrent
                            ? 'bg-emerald-50/40 border-emerald-300 shadow-sm'
                            : isFuture
                            ? 'bg-white border-slate-200 hover:border-blue-300 shadow-xs'
                            : 'bg-slate-50/60 border-slate-200 opacity-80'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3 border-slate-100">
                          <div className="flex items-center space-x-2 flex-wrap">
                            <span className="text-sm font-bold text-slate-900">
                              {app.worksiteName}
                            </span>
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" />
                              {app.city}/{app.state}
                            </span>
                            {isCurrent && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-600 text-white">
                                MISSÃO ATUAL
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            {getStatusBadge(app.status)}
                            <button
                              onClick={() => setDetailAppointment(app)}
                              className="p-1 text-slate-400 hover:text-blue-600 rounded"
                              title="Ver Detalhes"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenEdit(app)}
                              className="p-1 text-slate-400 hover:text-blue-600 rounded"
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handlePromptDeleteAppointment(app)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors"
                              title="Excluir Serviço"
                              id={`btn-timeline-delete-${app.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Middle Info */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-3 text-xs">
                          <div>
                            <span className="text-slate-400 text-[10px] font-bold uppercase block">
                              Período do Serviço
                            </span>
                            <span className="font-semibold text-slate-700">
                              {app.startDate.split('-').reverse().join('/')} até{' '}
                              {app.endDate.split('-').reverse().join('/')}
                            </span>
                            <span className="text-[10px] text-slate-400 block">
                              {app.startTime} às {app.endTime}
                            </span>
                          </div>

                          <div>
                            <span className="text-slate-400 text-[10px] font-bold uppercase block">
                              Serviços Planejados
                            </span>
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              {app.services.map((s, sIdx) => (
                                <span
                                  key={sIdx}
                                  className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-medium"
                                >
                                  {s}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div>
                            <span className="text-slate-400 text-[10px] font-bold uppercase block">
                              Ajudantes Escalados ({(app.helperIds || []).length})
                            </span>
                            <span className="font-medium text-slate-700">
                              {(app.helperIds || [])
                                .map((hId) => helpers.find((h) => h.id === hId)?.name || 'Ajudante')
                                .join(', ') || 'Nenhum ajudante'}
                            </span>
                          </div>
                        </div>

                        {/* Next Destination Block */}
                        {(app.nextDestinationCity || app.nextDestinationWorksite) && (
                          <div className="mt-3 pt-3 border-t border-slate-100/80 bg-blue-50/50 rounded-lg p-2.5 flex items-center justify-between text-xs text-blue-900">
                            <div className="flex items-center space-x-2">
                              <Truck className="w-4 h-4 text-blue-600 shrink-0" />
                              <span>
                                <strong>Próximo Destino Previsto:</strong>{' '}
                                {app.nextDestinationWorksite || 'Obra a definir'} em{' '}
                                <strong>
                                  {app.nextDestinationCity}/{app.nextDestinationState || 'UF'}
                                </strong>{' '}
                                {app.nextDestinationDate && (
                                  <span className="text-blue-700">
                                    (a partir de{' '}
                                    {app.nextDestinationDate.split('-').reverse().join('/')})
                                  </span>
                                )}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Fast Action to Launch Obra Registration */}
                        <div className="mt-3 flex justify-end gap-2">
                          <button
                            onClick={() => {
                              if (onOpenNewRDOWithAppointment) {
                                onOpenNewRDOWithAppointment(app);
                              }
                            }}
                            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-bold flex items-center space-x-1.5 transition-colors"
                          >
                            <HardHat className="w-3.5 h-3.5 text-amber-400" />
                            <span>Registrar Obra deste Agendamento</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* VIEW 3: TABLE / LIST */}
      {viewMode === 'TABLE' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">
              Todos os Agendamentos Cadastrados ({filteredAppointments.length})
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="p-3">Obra / Local</th>
                  <th className="p-3">Equipe / Líder</th>
                  <th className="p-3">Período</th>
                  <th className="p-3">Serviços</th>
                  <th className="p-3">Ajudantes</th>
                  <th className="p-3">Próximo Destino</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAppointments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-slate-400">
                      Nenhum agendamento encontrado com os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  filteredAppointments.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-semibold text-slate-800">
                        <div>{app.worksiteName}</div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1 font-normal">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {app.city}/{app.state}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-slate-800">{app.teamName}</div>
                        <div className="text-[10px] text-slate-500">Líder: {app.leaderName}</div>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <div className="font-medium text-slate-800">
                          {app.startDate.split('-').reverse().join('/')} a{' '}
                          {app.endDate.split('-').reverse().join('/')}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {app.startTime} às {app.endTime}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1 max-w-[180px]">
                          {app.services.map((s, idx) => (
                            <span
                              key={idx}
                              className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[9px] font-medium"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="font-bold text-slate-700">
                          {(app.helperIds || []).length} escalado(s)
                        </span>
                      </td>
                      <td className="p-3">
                        {app.nextDestinationCity ? (
                          <div className="text-[11px] text-slate-700 flex items-center gap-1">
                            <Truck className="w-3 h-3 text-blue-600" />
                            <span>
                              {app.nextDestinationCity}/{app.nextDestinationState}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[10px]">-</span>
                        )}
                      </td>
                      <td className="p-3">{getStatusBadge(app.status)}</td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => setDetailAppointment(app)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 rounded-md hover:bg-blue-50"
                            title="Ver Detalhes"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(app)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 rounded-md hover:bg-blue-50"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handlePromptDeleteAppointment(app)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors"
                            title="Excluir Serviço"
                            id={`btn-table-delete-${app.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: NOVO / EDITAR AGENDAMENTO */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-100">
            {/* Modal Header */}
            <div className="p-3.5 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 flex items-center gap-1 text-xs font-bold sm:hidden"
                  title="Voltar"
                >
                  <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                  <span>Voltar</span>
                </button>
                <span className="p-1.5 sm:p-2 rounded-xl bg-blue-600 text-white font-bold hidden sm:inline-block">
                  <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                </span>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    {editingAppointment ? 'Editar Agendamento' : 'Novo Agendamento'}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-500 hidden sm:block">
                    Defina obra, datas, equipe, ajudantes escalados e próximo destino.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 sm:p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Errors Box */}
              {formErrors.length > 0 && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl text-xs space-y-1">
                  <div className="font-bold flex items-center space-x-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Por favor corrija os seguintes pontos:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 pl-1">
                    {formErrors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* CONFLICT ALERTS CARD */}
              {formConflicts.length > 0 && (
                <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 space-y-2">
                  <div className="flex items-center space-x-2 text-amber-900 font-bold text-xs">
                    <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
                    <span>Conflitos de Agenda Detectados ({formConflicts.length})</span>
                  </div>
                  <div className="space-y-1.5">
                    {formConflicts.map((c, cIdx) => (
                      <div
                        key={cIdx}
                        className={`p-2.5 rounded-lg text-xs ${
                          c.severity === 'CRITICAL'
                            ? 'bg-rose-50 border border-rose-200 text-rose-900'
                            : 'bg-amber-100/60 border border-amber-200 text-amber-900'
                        }`}
                      >
                        <div className="font-bold">{c.title}</div>
                        <div className="text-[11px] mt-0.5">{c.description}</div>
                      </div>
                    ))}
                  </div>

                  {/* Override checkbox for admin */}
                  {isAdmin && (
                    <div className="pt-2 border-t border-amber-200 flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="overrideConflict"
                        checked={forceOverride}
                        onChange={(e) => setForceOverride(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                      />
                      <label
                        htmlFor="overrideConflict"
                        className="text-xs font-bold text-slate-800 cursor-pointer"
                      >
                        Autorizar e Forçar Gravação (Ação de Administrador registrada em auditoria)
                      </label>
                    </div>
                  )}
                </div>
              )}

              {/* SECTION 1: OBRA E LOCAL */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b pb-2 border-slate-100">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  1. Localização e Obra
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Obra Cadastrada *
                    </label>
                    <select
                      value={formData.worksiteId}
                      onChange={(e) => handleFormWorksiteChange(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:border-blue-500"
                    >
                      <option value="">Selecione uma obra...</option>
                      {worksites.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name} - {w.city}/{w.state}
                        </option>
                      ))}
                      <option value="CUSTOM">➕ Obra Avulsa / Não Cadastrada</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Nome da Obra *
                    </label>
                    <input
                      type="text"
                      value={formData.worksiteName}
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, worksiteName: e.target.value }));
                        checkLiveConflicts({ ...formData, worksiteName: e.target.value });
                      }}
                      placeholder="Ex: Condomínio Solar das Flores"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Cidade *</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, city: e.target.value }))
                      }
                      placeholder="Ex: Pomerode"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Estado / UF *</label>
                    <select
                      value={formData.state}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, state: e.target.value }))
                      }
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:border-blue-500"
                    >
                      <option value="PR">PR - Paraná</option>
                      <option value="SC">SC - Santa Catarina</option>
                      <option value="SP">SP - São Paulo</option>
                      <option value="RS">RS - Rio Grande do Sul</option>
                      <option value="RJ">RJ - Rio de Janeiro</option>
                      <option value="MG">MG - Minas Gerais</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 2: DATAS E HORÁRIOS */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b pb-2 border-slate-100">
                  <Clock className="w-4 h-4 text-blue-600" />
                  2. Período e Horários
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Data Início *
                    </label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, startDate: e.target.value }));
                        checkLiveConflicts({ ...formData, startDate: e.target.value });
                      }}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Data Término *
                    </label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, endDate: e.target.value }));
                        checkLiveConflicts({ ...formData, endDate: e.target.value });
                      }}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Horário Início
                    </label>
                    <input
                      type="time"
                      value={formData.startTime}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, startTime: e.target.value }))
                      }
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Horário Término
                    </label>
                    <input
                      type="time"
                      value={formData.endTime}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, endTime: e.target.value }))
                      }
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: EQUIPE E AJUDANTES */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b pb-2 border-slate-100">
                  <Users className="w-4 h-4 text-blue-600" />
                  3. Equipe Responsável & Ajudantes Escalados
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Equipe Encarregada *
                    </label>
                    <select
                      value={formData.teamId}
                      onChange={(e) => handleFormTeamChange(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:bg-white focus:border-blue-500"
                    >
                      <option value="">Selecione uma equipe...</option>
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} (Líder: {t.leaderName})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Status Inicial
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          status: e.target.value as AppointmentStatus,
                        }))
                      }
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:bg-white focus:border-blue-500"
                    >
                      <option value="PLANEJADO">🟡 Planejado</option>
                      <option value="CONFIRMADO">🔵 Confirmado</option>
                      <option value="EM_ANDAMENTO">🟢 Em Andamento</option>
                      <option value="CONCLUIDO">✅ Concluído</option>
                      <option value="CANCELADO">🔴 Cancelado</option>
                    </select>
                  </div>
                </div>

                {/* Helper Multi-Checkboxes */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-700">
                      Ajudantes Específicos para este Serviço ({formData.helperIds.length} selecionados)
                    </label>
                    <span className="text-[10px] text-slate-400">
                      Selecione quem realmente participará desta obra
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-xl">
                    {currentTeamHelpers.map((h) => {
                      const isChecked = formData.helperIds.includes(h.id);
                      return (
                        <label
                          key={h.id}
                          className={`p-2 rounded-lg border text-xs flex items-center space-x-2 cursor-pointer transition-all ${
                            isChecked
                              ? 'bg-blue-50 border-blue-300 text-blue-900 font-bold'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100/60'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleHelper(h.id)}
                            className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                          />
                          <div className="truncate flex-1">
                            <div className="truncate">{h.name}</div>
                            <div className="text-[10px] text-slate-400 font-normal truncate">
                              {h.role}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* SECTION 4: SERVIÇOS A EXECUTAR */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b pb-2 border-slate-100">
                  <HardHat className="w-4 h-4 text-blue-600" />
                  4. Serviços a Serem Executados
                </h4>

                <div className="flex flex-wrap gap-2">
                  {STANDARD_SERVICES.map((srv) => {
                    const isSelected = (formData.services || []).includes(srv);
                    return (
                      <button
                        type="button"
                        key={srv}
                        onClick={() => handleToggleService(srv)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {srv}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 5: PRÓXIMO DESTINO DA EQUIPE */}
              <div className="space-y-4 bg-blue-50/40 p-4 rounded-xl border border-blue-200">
                <h4 className="text-xs font-bold text-blue-950 uppercase tracking-wider flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-blue-600" />
                  5. Próximo Destino da Equipe (Após finalizar esta obra)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Próxima Cidade / UF
                    </label>
                    <input
                      type="text"
                      value={formData.nextDestinationCity}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          nextDestinationCity: e.target.value,
                        }))
                      }
                      placeholder="Ex: São Paulo"
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Próxima Obra Prevista
                    </label>
                    <input
                      type="text"
                      value={formData.nextDestinationWorksite}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          nextDestinationWorksite: e.target.value,
                        }))
                      }
                      placeholder="Ex: Unidade Centro Logístico"
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Data Prevista Início
                    </label>
                    <input
                      type="date"
                      value={formData.nextDestinationDate}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          nextDestinationDate: e.target.value,
                        }))
                      }
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 6: OBSERVAÇÕES */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Observações e Orientações Técnicas
                </label>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Informações adicionais para a equipe (ex: retirar chaves na portaria, uso de EPI obrigatório, etc.)..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:border-blue-500"
                />
              </div>
            </form>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Cancelar
                </button>
                {editingAppointment && (
                  <button
                    type="button"
                    onClick={() => handlePromptDeleteAppointment(editingAppointment)}
                    className="px-3 py-2 bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 rounded-lg text-xs font-bold transition-colors flex items-center space-x-1"
                    id="btn-form-delete-appointment"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Excluir Serviço</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={handleFormSubmit}
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-xs flex items-center space-x-1.5 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Salvando...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{editingAppointment ? 'Atualizar Agendamento' : 'Salvar Agendamento'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DETALHES RÁPIDOS DO AGENDAMENTO */}
      {detailAppointment && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2">
                <span className="p-2 rounded-lg bg-blue-50 text-blue-600">
                  <CalendarIcon className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {detailAppointment.worksiteName}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {detailAppointment.city}/{detailAppointment.state}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDetailAppointment(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Status Atual:</span>
                <div>{getStatusBadge(detailAppointment.status)}</div>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Equipe</span>
                  <span className="font-bold text-slate-800 text-sm">
                    {detailAppointment.teamName}
                  </span>
                  <span className="text-slate-500 text-[10px] block">
                    Líder: {detailAppointment.leaderName}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Período</span>
                  <span className="font-bold text-slate-800">
                    {detailAppointment.startDate.split('-').reverse().join('/')} a{' '}
                    {detailAppointment.endDate.split('-').reverse().join('/')}
                  </span>
                  <span className="text-slate-500 text-[10px] block">
                    {detailAppointment.startTime} às {detailAppointment.endTime}
                  </span>
                </div>
              </div>

              {/* Services */}
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                  Serviços Previstos
                </span>
                <div className="flex flex-wrap gap-1">
                  {detailAppointment.services.map((s, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 bg-blue-50 text-blue-700 font-medium rounded text-xs"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              {/* Helpers */}
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                  Ajudantes Escalados ({(detailAppointment.helperIds || []).length})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(detailAppointment.helperIds || []).map((hId) => {
                    const h = helpers.find((item) => item.id === hId);
                    return (
                      <span
                        key={hId}
                        className="px-2 py-1 bg-slate-100 text-slate-800 rounded-md text-xs font-semibold"
                      >
                        {h ? h.name : 'Ajudante'}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Next Destination */}
              {(detailAppointment.nextDestinationCity ||
                detailAppointment.nextDestinationWorksite) && (
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1">
                  <div className="font-bold text-blue-900 flex items-center space-x-1.5">
                    <Truck className="w-4 h-4 text-blue-600" />
                    <span>Próximo Destino Programado</span>
                  </div>
                  <div className="text-slate-700">
                    {detailAppointment.nextDestinationWorksite} em{' '}
                    <strong>
                      {detailAppointment.nextDestinationCity}/
                      {detailAppointment.nextDestinationState}
                    </strong>
                  </div>
                  {detailAppointment.nextDestinationDate && (
                    <div className="text-[10px] text-blue-700">
                      Início previsto:{' '}
                      {detailAppointment.nextDestinationDate.split('-').reverse().join('/')}
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              {detailAppointment.notes && (
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">
                    Observações
                  </span>
                  <p className="text-slate-600 bg-slate-50 p-2.5 rounded-lg">
                    {detailAppointment.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => {
                    const app = detailAppointment;
                    setDetailAppointment(null);
                    handleOpenEdit(app);
                  }}
                  className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold transition-colors"
                >
                  Editar
                </button>
                <button
                  onClick={() => handlePromptDeleteAppointment(detailAppointment)}
                  className="px-3 py-1.5 bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 rounded-lg text-xs font-bold transition-colors flex items-center space-x-1"
                  id="btn-detail-modal-delete-service"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Excluir</span>
                </button>
              </div>

              <button
                onClick={() => {
                  const app = detailAppointment;
                  setDetailAppointment(null);
                  if (onOpenNewRDOWithAppointment) {
                    onOpenNewRDOWithAppointment(app);
                  }
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors"
              >
                <HardHat className="w-4 h-4" />
                <span>Registrar Obra</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAÇÃO DE EXCLUSÃO DE SERVIÇO */}
      {appointmentToDelete && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-rose-100 overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-rose-100 bg-rose-50/60 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    Excluir Agendamento de Serviço
                  </h3>
                  <p className="text-[11px] text-rose-700 font-medium">
                    Ação permanente no calendário de obras
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAppointmentToDelete(null)}
                disabled={isDeletingAppointment}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-5 space-y-3.5 text-xs">
              <p className="text-slate-700 font-medium">
                Tem certeza que deseja excluir o agendamento deste serviço?
              </p>

              {/* Service details card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Obra / Local</span>
                  <span className="font-bold text-slate-900 text-sm block">
                    {appointmentToDelete.worksiteName}
                  </span>
                  <span className="text-slate-500 text-[11px]">
                    {appointmentToDelete.city}/{appointmentToDelete.state}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Equipe</span>
                    <span className="font-bold text-slate-800">{appointmentToDelete.teamName}</span>
                    <span className="text-slate-500 text-[10px] block">Líder: {appointmentToDelete.leaderName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Período</span>
                    <span className="font-bold text-slate-800">
                      {appointmentToDelete.startDate.split('-').reverse().join('/')} a {appointmentToDelete.endDate.split('-').reverse().join('/')}
                    </span>
                    <span className="text-slate-500 text-[10px] block">
                      {appointmentToDelete.startTime} às {appointmentToDelete.endTime}
                    </span>
                  </div>
                </div>

                {appointmentToDelete.services && appointmentToDelete.services.length > 0 && (
                  <div className="pt-2 border-t border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Serviços</span>
                    <div className="flex flex-wrap gap-1">
                      {appointmentToDelete.services.map((s, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-semibold">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Esta ação removerá o agendamento da escala da equipe e do calendário de serviços da empresa.
                </span>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setAppointmentToDelete(null)}
                disabled={isDeletingAppointment}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleConfirmDeleteAppointment}
                disabled={isDeletingAppointment}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold shadow-xs flex items-center space-x-1.5 transition-colors disabled:opacity-50"
                id="btn-confirm-delete-appointment"
              >
                {isDeletingAppointment ? (
                  <span>Excluindo...</span>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Excluir Serviço</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
