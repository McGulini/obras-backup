import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  HardHat,
  MapPin,
  Clock,
  Truck,
  Users,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  ChevronRight,
  Plus,
  Building2,
  FileText,
  Sparkles,
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Appointment, AppointmentStatus } from '../types';

interface MyScheduleViewProps {
  onOpenNewRDOWithAppointment: (appointment: Appointment) => void;
  onNavigateTab: (tab: string) => void;
}

export const MyScheduleView: React.FC<MyScheduleViewProps> = ({
  onOpenNewRDOWithAppointment,
  onNavigateTab,
}) => {
  const { currentUser, isAdmin } = useAuth();
  const { appointments = [], helpers = [], teams = [] } = useData();

  // Selected team (defaults to current user's team, or first team if admin)
  const userTeam = useMemo(() => {
    if (currentUser?.teamId) {
      return teams.find((t) => t.id === currentUser.teamId) || null;
    }
    return teams[0] || null;
  }, [currentUser, teams]);

  const [selectedTeamId, setSelectedTeamId] = useState<string>(
    userTeam?.id || teams[0]?.id || ''
  );

  const activeTeam = teams.find((t) => t.id === selectedTeamId) || userTeam;
  const todayStr = new Date().toISOString().split('T')[0];

  // Team's appointments sorted by start date
  const teamAppointments = useMemo(() => {
    return appointments
      .filter((a) => a.teamId === activeTeam?.id && a.status !== 'CANCELADO')
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
  }, [appointments, activeTeam]);

  // Current active appointment for today
  const currentMission = useMemo(() => {
    return (
      teamAppointments.find(
        (a) => a.startDate <= todayStr && a.endDate >= todayStr
      ) || null
    );
  }, [teamAppointments, todayStr]);

  // Next upcoming mission
  const nextMission = useMemo(() => {
    return (
      teamAppointments.find((a) => a.startDate > todayStr) || null
    );
  }, [teamAppointments, todayStr]);

  // Status Badge Helper
  const getStatusBadge = (status: AppointmentStatus) => {
    switch (status) {
      case 'PLANEJADO':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            🟡 Planejado
          </span>
        );
      case 'CONFIRMADO':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
            🔵 Confirmado
          </span>
        );
      case 'EM_ANDAMENTO':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            🟢 Em Andamento
          </span>
        );
      case 'CONCLUIDO':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
            ✅ Concluído
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in" id="my-schedule-container">
      {/* Top Back Navigation & Header */}
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => onNavigateTab('dashboard')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold shadow-xs transition-colors"
          id="btn-schedule-back-dashboard"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>← Voltar ao Painel</span>
        </button>

        {isAdmin && teams.length > 1 && (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 hidden sm:inline">Equipe:</span>
            <select
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
              className="bg-white border border-slate-200 text-slate-800 rounded-lg py-1 px-2 text-xs font-bold focus:outline-none focus:border-blue-500 shadow-xs"
            >
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.leaderName})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Top Banner (Compact on Mobile) */}
      <div className="bg-slate-900 text-white rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-xs border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-black uppercase bg-blue-600 text-white">
              Minha Programação
            </span>
            <span className="text-[11px] sm:text-xs text-slate-400">
              {new Date().toLocaleDateString('pt-BR', {
                weekday: 'short',
                day: '2-digit',
                month: 'short',
              })}
            </span>
          </div>
          <h2 className="text-base sm:text-xl font-bold text-white mt-1">
            Equipe: {activeTeam?.name || 'Equipe de Campo'}
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-300">
            Líder: <strong>{activeTeam?.leaderName}</strong> {activeTeam?.leaderPhone ? `• ${activeTeam.leaderPhone}` : ''}
          </p>
        </div>
      </div>

      {/* CARD 1: HOJE - SERVIÇO ATUAL EM DESTAQUE (HIGHLY COMPACT FOR MOBILE CHIEFS) */}
      {currentMission ? (
        <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-900 text-white rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-md border border-emerald-500/30 space-y-3 sm:space-y-4">
          {/* Header Row */}
          <div className="flex items-start justify-between gap-2 border-b border-emerald-500/20 pb-2.5 sm:pb-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-400 flex items-center justify-center font-bold shrink-0">
                <HardHat className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-emerald-500 text-slate-950">
                    HOJE
                  </span>
                  {getStatusBadge(currentMission.status)}
                </div>
                <h3 className="text-sm sm:text-lg font-black text-white leading-snug mt-0.5">
                  {currentMission.worksiteName}
                </h3>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="text-[11px] sm:text-xs text-emerald-300 font-bold block">
                {currentMission.startDate.split('-').reverse().join('/')}
              </span>
              <span className="text-[10px] text-slate-400 block">
                {currentMission.startTime} às {currentMission.endTime}
              </span>
            </div>
          </div>

          {/* Quick Info Grid for Mobile Field Chiefs: Cidade, Obra, Período, Equipe */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 text-xs">
            {/* 📍 Cidade */}
            <div className="bg-white/5 border border-white/10 p-2.5 sm:p-3 rounded-lg sm:rounded-xl space-y-0.5">
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                📍 Cidade & Local
              </span>
              <p className="font-bold text-white text-xs sm:text-sm truncate">
                {currentMission.city}/{currentMission.state}
              </p>
              {currentMission.address && (
                <p className="text-[10px] text-slate-300 truncate">{currentMission.address}</p>
              )}
            </div>

            {/* 🏗️ Obra & Serviços */}
            <div className="bg-white/5 border border-white/10 p-2.5 sm:p-3 rounded-lg sm:rounded-xl space-y-0.5">
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                🏗️ Serviços Previstos
              </span>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {currentMission.services.map((srv, idx) => (
                  <span
                    key={idx}
                    className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-200 rounded text-[10px] font-semibold truncate max-w-full"
                  >
                    {srv}
                  </span>
                ))}
              </div>
            </div>

            {/* 👷 Equipe & Ajudantes */}
            <div className="bg-white/5 border border-white/10 p-2.5 sm:p-3 rounded-lg sm:rounded-xl space-y-0.5">
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                👷 Ajudantes Escalados ({(currentMission.helperIds || []).length})
              </span>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {(currentMission.helperIds || []).map((hId) => {
                  const h = helpers.find((item) => item.id === hId);
                  return (
                    <span
                      key={hId}
                      className="px-1.5 py-0.2 bg-slate-800 border border-slate-700 text-slate-200 rounded text-[10px] font-medium"
                    >
                      {h ? h.name.split(' ')[0] : 'Ajudante'}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Notes if any */}
          {currentMission.notes && (
            <div className="p-2.5 bg-white/5 border border-white/10 rounded-lg text-[11px] text-slate-300">
              <strong className="text-emerald-400">Obs:</strong> {currentMission.notes}
            </div>
          )}

          {/* Action Button: Preencher RDO Deste Agendamento */}
          <div className="pt-1">
            <button
              onClick={() => onOpenNewRDOWithAppointment(currentMission)}
              className="w-full py-2.5 sm:py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg sm:rounded-xl font-black text-xs sm:text-sm shadow-md flex items-center justify-center space-x-2 transition-all active:scale-[0.98]"
            >
              <HardHat className="w-4 h-4 text-slate-950 shrink-0" />
              <span>Preencher RDO Deste Agendamento</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 text-center space-y-2 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <h3 className="text-sm sm:text-base font-bold text-slate-800">
            Nenhum serviço em andamento agendado para hoje.
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Consulte o próximo destino programado ou verifique o itinerário abaixo.
          </p>
        </div>
      )}

      {/* CARD 2: PRÓXIMO DESTINO & DESLOCAMENTO (COMPACT FORMAT) */}
      {(() => {
        const destCity =
          currentMission?.nextDestinationCity || nextMission?.city;
        const destState =
          currentMission?.nextDestinationState || nextMission?.state || 'PR';
        const destWorksite =
          currentMission?.nextDestinationWorksite || nextMission?.worksiteName;
        const destDate =
          currentMission?.nextDestinationDate || nextMission?.startDate;
        const destServices = nextMission?.services || [];

        if (!destCity && !nextMission) return null;

        return (
          <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 text-white rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-xs border border-blue-700/40 space-y-3">
            <div className="flex items-center justify-between border-b border-blue-500/30 pb-2">
              <div className="flex items-center space-x-2">
                <Truck className="w-4 h-4 text-blue-400 shrink-0" />
                <h3 className="text-xs sm:text-sm font-bold text-white">
                  Próximo Destino da Equipe
                </h3>
              </div>
              <span className="px-2 py-0.2 rounded-full text-[9px] font-bold uppercase bg-blue-500/30 text-blue-200 border border-blue-400/30">
                🚚 Deslocamento
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 text-xs">
              <div className="bg-white/5 p-2.5 rounded-lg border border-white/10">
                <span className="text-[9px] font-bold text-blue-300 uppercase block">
                  📍 Cidade
                </span>
                <span className="text-xs sm:text-sm font-black text-white mt-0.5 block truncate">
                  {destCity}/{destState}
                </span>
                <span className="text-[10px] text-blue-200 truncate block">
                  {destWorksite || 'Obra a confirmar'}
                </span>
              </div>

              <div className="bg-white/5 p-2.5 rounded-lg border border-white/10">
                <span className="text-[9px] font-bold text-blue-300 uppercase block">
                  📅 Data Prevista
                </span>
                <span className="text-xs sm:text-sm font-black text-white mt-0.5 block">
                  {destDate ? destDate.split('-').reverse().join('/') : 'A definir'}
                </span>
                <span className="text-[10px] text-blue-200">
                  Após término da obra atual
                </span>
              </div>

              <div className="col-span-2 sm:col-span-1 bg-white/5 p-2.5 rounded-lg border border-white/10">
                <span className="text-[9px] font-bold text-blue-300 uppercase block">
                  🏗️ Obra Prevista
                </span>
                <span className="text-xs sm:text-sm font-bold text-white mt-0.5 block truncate">
                  {destWorksite || 'Conforme escala'}
                </span>
                {destServices.length > 0 && (
                  <span className="text-[10px] text-slate-300 truncate block mt-0.5">
                    {destServices.join(', ')}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* CARD 3: CRONOGRAMA COMPLETO DA EQUIPE */}
      <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 p-3.5 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b pb-2.5 border-slate-100">
          <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center space-x-1.5">
            <CalendarIcon className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Itinerário Completo de Agendamentos</span>
          </h3>
          <span className="text-[11px] text-slate-500 font-medium">
            {teamAppointments.length} registro(s)
          </span>
        </div>

        {teamAppointments.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-xs">
            Nenhum agendamento cadastrado para esta equipe.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {teamAppointments.map((app) => {
              const isCurrent = app.startDate <= todayStr && app.endDate >= todayStr;

              return (
                <div
                  key={app.id}
                  className={`py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-colors ${
                    isCurrent ? 'bg-emerald-50/40 p-2.5 rounded-lg' : ''
                  }`}
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center space-x-1.5 flex-wrap">
                      <span className="font-bold text-slate-900 text-xs sm:text-sm">
                        {app.worksiteName}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        • {app.city}/{app.state}
                      </span>
                      {getStatusBadge(app.status)}
                    </div>

                    <div className="text-[11px] text-slate-600 flex items-center gap-2 flex-wrap">
                      <span>
                        📅 {app.startDate.split('-').reverse().join('/')} a{' '}
                        {app.endDate.split('-').reverse().join('/')}
                      </span>
                      <span>⏰ {app.startTime} - {app.endTime}</span>
                    </div>

                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {app.services.map((s, idx) => (
                        <span
                          key={idx}
                          className="px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded text-[9px] font-medium"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0 pt-1 sm:pt-0">
                    <button
                      onClick={() => onOpenNewRDOWithAppointment(app)}
                      className="w-full sm:w-auto px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center justify-center space-x-1 transition-colors"
                    >
                      <HardHat className="w-3 h-3 text-amber-400" />
                      <span>Registrar Obra</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
