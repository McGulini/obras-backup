import React from 'react';
import {
  HardHat,
  Users,
  Building,
  AlertTriangle,
  Calendar,
  Clock,
  MapPin,
  TrendingUp,
  FileText,
  Plus,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  CalendarRange,
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { DailyLog } from '../types';

interface AdminDashboardProps {
  onNavigateTab: (tab: string) => void;
  onOpenNewRDO: () => void;
  onViewLogDetail: (log: DailyLog) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onNavigateTab,
  onOpenNewRDO,
  onViewLogDetail,
}) => {
  const { teams = [], worksites = [], dailyLogs = [], occurrences = [], helpers = [], appointments = [] } = useData();
  const { currentUser } = useAuth();

  const todayStr = new Date().toISOString().split('T')[0];
  const todayLogs = (dailyLogs || []).filter((l) => l && l.date === todayStr);

  const activeTeams = (teams || []).filter((t) => t && t.active);
  const activeWorksites = (worksites || []).filter((w) => w && w.status === 'EM_ANDAMENTO');
  const completedWorksites = (worksites || []).filter((w) => w && w.status === 'CONCLUIDA');
  const pendingOccurrences = (occurrences || []).filter((o) => o && o.status === 'PENDENTE');
  const inProgressOccurrences = (occurrences || []).filter((o) => o && o.status === 'EM_ATENDIMENTO');
  const activeAppointments = (appointments || []).filter((a) => a && a.status !== 'CANCELADO' && a.status !== 'CONCLUIDO');

  // Cities active today
  const activeCitiesToday = Array.from(new Set(todayLogs.map((l) => l.city).filter(Boolean)));

  // Total workers in field today
  const totalFieldWorkersToday = todayLogs.reduce(
    (acc, l) => acc + 1 + ((l.helpersPresent || []).length || 0),
    0
  );

  const teamAttendancePercentage = activeTeams.length > 0
    ? Math.round((todayLogs.length / activeTeams.length) * 100)
    : 100;

  const getStatusPill = (status: string) => {
    switch (status) {
      case 'CONCLUIDO_DIA':
        return (
          <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[9px] sm:text-[10px] font-bold uppercase">
            Concluído
          </span>
        );
      case 'EM_ANDAMENTO':
        return (
          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[9px] sm:text-[10px] font-bold uppercase">
            Em execução
          </span>
        );
      case 'PARALISADO':
        return (
          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[9px] sm:text-[10px] font-bold uppercase">
            Pausado
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[9px] sm:text-[10px] font-bold uppercase">
            {status}
          </span>
        );
    }
  };

  const getServiceTagClass = (svc: string) => {
    if (svc.includes('Termo')) return 'bg-blue-100 text-blue-700';
    if (svc.includes('Substituição') || svc.includes('Remoção')) return 'bg-yellow-100 text-yellow-700';
    if (svc.includes('Instalação')) return 'bg-slate-100 text-slate-700';
    return 'bg-blue-50 text-blue-700';
  };

  return (
    <div className="space-y-4 sm:space-y-6" id="admin-dashboard-container">
      {/* Top 4 High-Impact KPI Cards (2x2 on Mobile, 4-col on Desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Equipes em Campo */}
        <div
          onClick={() => onNavigateTab('daily-overview')}
          className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 shadow-xs flex items-center justify-between cursor-pointer hover:border-slate-300 transition-colors"
        >
          <div className="min-w-0">
            <p className="text-slate-500 text-[10px] sm:text-xs uppercase font-bold tracking-wider truncate">
              Equipes em Campo
            </p>
            <h3 className="text-xl sm:text-3xl font-black text-slate-800 mt-0.5">
              {todayLogs.length}/{activeTeams.length}
            </h3>
            <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium truncate">
              {totalFieldWorkersToday} trabalhadores
            </p>
          </div>
          <div className="w-9 h-9 sm:w-12 sm:h-12 bg-green-50 rounded-full flex items-center justify-center text-green-600 font-bold text-xs sm:text-sm shrink-0 ml-1">
            {teamAttendancePercentage}%
          </div>
        </div>

        {/* Agendamentos Programados */}
        <div
          onClick={() => onNavigateTab('appointments')}
          className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 shadow-xs flex items-center justify-between cursor-pointer hover:border-blue-300 transition-colors group"
        >
          <div className="min-w-0">
            <p className="text-slate-500 text-[10px] sm:text-xs uppercase font-bold tracking-wider truncate">
              Agendamentos
            </p>
            <h3 className="text-xl sm:text-3xl font-black text-blue-600 mt-0.5">
              {activeAppointments.length}
            </h3>
            <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium truncate">
              missões ativas
            </p>
          </div>
          <div className="w-9 h-9 sm:w-12 sm:h-12 bg-blue-50 group-hover:bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-base sm:text-xl shrink-0 ml-1 transition-colors">
            📅
          </div>
        </div>

        {/* Obras Ativas */}
        <div
          onClick={() => onNavigateTab('worksites')}
          className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 shadow-xs flex items-center justify-between cursor-pointer hover:border-slate-300 transition-colors"
        >
          <div className="min-w-0">
            <p className="text-slate-500 text-[10px] sm:text-xs uppercase font-bold tracking-wider truncate">
              Obras Ativas
            </p>
            <h3 className="text-xl sm:text-3xl font-black text-slate-800 mt-0.5">
              {activeWorksites.length}
            </h3>
            <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium truncate">
              de {worksites.length} ({completedWorksites.length} concl.)
            </p>
          </div>
          <div className="w-9 h-9 sm:w-12 sm:h-12 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 font-bold text-base sm:text-xl shrink-0 ml-1">
            🏛️
          </div>
        </div>

        {/* Ocorrências Críticas */}
        <div
          onClick={() => onNavigateTab('occurrences')}
          className={`rounded-xl p-3 sm:p-4 shadow-xs flex items-center justify-between cursor-pointer transition-colors ${
            pendingOccurrences.length > 0
              ? 'bg-red-50 border border-red-200 hover:border-red-300'
              : 'bg-white border border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="min-w-0">
            <p
              className={`text-[10px] sm:text-xs uppercase font-bold tracking-wider truncate ${
                pendingOccurrences.length > 0 ? 'text-red-600' : 'text-slate-500'
              }`}
            >
              Ocorrências
            </p>
            <h3
              className={`text-xl sm:text-3xl font-black mt-0.5 ${
                pendingOccurrences.length > 0 ? 'text-red-700' : 'text-slate-800'
              }`}
            >
              {String(pendingOccurrences.length).padStart(2, '0')}
            </h3>
            <p
              className={`text-[10px] sm:text-[11px] font-medium truncate ${
                pendingOccurrences.length > 0 ? 'text-red-600' : 'text-slate-500'
              }`}
            >
              {inProgressOccurrences.length} em atend.
            </p>
          </div>
          <div
            className={`w-9 h-9 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-bold text-base sm:text-xl shrink-0 ml-1 ${
              pendingOccurrences.length > 0
                ? 'bg-red-100 text-red-600 animate-pulse'
                : 'bg-slate-100 text-slate-500'
            }`}
          >
            ⚠️
          </div>
        </div>
      </div>

      {/* Main Grid: Left (Col 8) Table + Right (Col 4) Critical Occurrences & Efficiency */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        {/* Left Column (8 cols): Atividades do Dia (Geral) Table / Cards */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl shadow-xs flex flex-col overflow-hidden">
          <div className="p-3 sm:p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div>
              <h2 className="font-bold text-slate-800 text-sm sm:text-base">Atividades do Dia (Geral)</h2>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                Distribuição matinal das equipes e serviços.
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('daily-overview')}
              className="text-xs text-blue-600 hover:text-blue-700 font-bold"
            >
              Ver todas →
            </button>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block flex-1 overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 sticky top-0 border-b border-slate-200">
                <tr className="text-[10px] text-slate-400 uppercase font-bold">
                  <th className="px-4 py-3">Equipe/Líder</th>
                  <th className="px-4 py-3">Local/Cidade</th>
                  <th className="px-4 py-3">Serviços Realizados</th>
                  <th className="px-4 py-3 text-center">Ajudantes</th>
                  <th className="px-4 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {todayLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400 text-xs">
                      Nenhum registro lançado para hoje ainda.{' '}
                      <button
                        onClick={onOpenNewRDO}
                        className="text-blue-600 font-bold hover:underline ml-1"
                      >
                        Registrar primeira Obra
                      </button>
                    </td>
                  </tr>
                ) : (
                  todayLogs.map((log) => (
                    <tr
                      key={log.id}
                      onClick={() => onViewLogDetail(log)}
                      className="text-sm hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900 text-xs">{log.teamName}</div>
                        <div className="text-[11px] text-slate-500">Líder: {log.leaderName}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900 text-xs">{log.city}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[140px]">
                          {log.worksiteName}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 flex-wrap">
                          {log.services.map((svc) => (
                            <span
                              key={svc}
                              className={`text-[9px] px-1.5 py-0.2 rounded uppercase font-bold ${getServiceTagClass(
                                svc
                              )}`}
                            >
                              {svc.replace(' de placas', '').replace(' viária', '')}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center font-mono font-bold text-slate-600 text-xs">
                        {String(log.helpersPresent?.length || 0).padStart(2, '0')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {getStatusPill(log.status)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List (Optimized for Small Screens) */}
          <div className="md:hidden divide-y divide-slate-100 p-2">
            {todayLogs.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">
                Nenhum registro lançado para hoje ainda.{' '}
                <button
                  onClick={onOpenNewRDO}
                  className="text-blue-600 font-bold block mt-1"
                >
                  + Registrar primeira Obra
                </button>
              </div>
            ) : (
              todayLogs.map((log) => (
                <div
                  key={log.id}
                  onClick={() => onViewLogDetail(log)}
                  className="p-2.5 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900">{log.teamName}</span>
                    {getStatusPill(log.status)}
                  </div>
                  <div className="text-[11px] text-slate-600 flex items-center justify-between">
                    <span>📍 {log.city} • {log.worksiteName}</span>
                    <span className="font-mono text-slate-400">👷 {(log.helpersPresent || []).length}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {(log.services || []).map((svc) => (
                      <span
                        key={svc}
                        className="text-[9px] px-1 py-0.2 bg-slate-100 text-slate-700 rounded font-semibold"
                      >
                        {svc}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Quick shortcuts at bottom of left table */}
          <div className="p-2.5 sm:p-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>
              Total: <strong>{todayLogs.length}</strong> equipes hoje
            </span>
            <button
              onClick={() => onNavigateTab('history')}
              className="text-blue-600 font-bold hover:underline"
            >
              Consultar histórico →
            </button>
          </div>
        </div>

        {/* Right Column (4 cols): Ocorrências Críticas Card & Resumo de Eficiência */}
        <div className="lg:col-span-4 flex flex-col gap-4 sm:gap-6">
          {/* Card: Ocorrências que requerem atenção */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs flex flex-col flex-1">
            <div className="p-3 sm:p-4 border-b border-slate-100 bg-red-600 text-white rounded-t-xl">
              <h2 className="font-bold text-xs sm:text-sm uppercase tracking-wider flex items-center gap-1.5">
                <span>🚨</span>
                <span>Ocorrências com Atenção</span>
              </h2>
            </div>

            <div className="p-3 sm:p-4 flex-1 overflow-y-auto space-y-2.5 max-h-72">
              {occurrences.filter((o) => o.status !== 'RESOLVIDO').length === 0 ? (
                <div className="text-center py-5 text-slate-400 text-xs">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
                  <p className="font-medium text-slate-700">Nenhuma ocorrência pendente</p>
                  <p className="text-[10px] text-slate-400">Operações de campo normais</p>
                </div>
              ) : (
                occurrences
                  .filter((o) => o.status !== 'RESOLVIDO')
                  .slice(0, 3)
                  .map((occ) => {
                    const isPending = occ.status === 'PENDENTE';
                    return (
                      <div
                        key={occ.id}
                        onClick={() => onNavigateTab('occurrences')}
                        className={`p-2.5 rounded-lg border-l-4 cursor-pointer hover:opacity-90 transition-opacity ${
                          isPending
                            ? 'border-red-500 bg-red-50'
                            : 'border-amber-500 bg-amber-50'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-0.5">
                          <span
                            className={`text-[11px] font-bold ${
                              isPending ? 'text-red-700' : 'text-amber-800'
                            }`}
                          >
                            {occ.teamName}
                          </span>
                          <span
                            className={`text-[9px] px-1 py-0.2 rounded font-bold uppercase ${
                              isPending
                                ? 'bg-red-200 text-red-800'
                                : 'bg-amber-200 text-amber-800'
                            }`}
                          >
                            {occ.status === 'PENDENTE' ? 'PENDENTE' : 'ATENDIMENTO'}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-slate-800 truncate">{occ.category}</p>
                        <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5">
                          {occ.description}
                        </p>
                        <div className="flex justify-between items-center text-[9px] text-slate-400 font-mono mt-1">
                          <span>{occ.city}</span>
                          <span>{occ.date?.split('-').reverse().join('/')}</span>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>

            <div className="p-2.5 sm:p-3 border-t border-slate-100">
              <button
                onClick={() => onNavigateTab('occurrences')}
                className="w-full py-2 bg-slate-800 text-white text-[11px] font-bold rounded-lg hover:bg-slate-700 transition-colors uppercase tracking-wider"
              >
                Gerenciar Ocorrências ({occurrences.length})
              </button>
            </div>
          </div>

          {/* Dark Widget: Resumo de Eficiência */}
          <div className="bg-slate-900 text-white rounded-xl p-3.5 sm:p-4 shadow-xs flex flex-col justify-between">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                Resumo de Eficiência
              </span>
              <span className="text-green-400 text-xs font-bold">+12.4%</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <span className="text-xs text-slate-300">Obras concluídas no mês</span>
                <span className="text-lg font-bold">{completedWorksites.length || 24}</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: '75%' }}
                />
              </div>
              <div className="flex justify-between items-end">
                <span className="text-xs text-slate-300">Cidades atendidas hoje</span>
                <span className="text-lg font-bold">{String(activeCitiesToday.length || 8).padStart(2, '0')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
