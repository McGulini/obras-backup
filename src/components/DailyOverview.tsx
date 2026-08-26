import React, { useState } from 'react';
import {
  Calendar,
  Users,
  Building,
  MapPin,
  Clock,
  HardHat,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  FileDown,
  Printer,
  Eye,
  CheckCircle2,
  Filter,
  Layers,
  Phone,
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { DailyLog } from '../types';
import { exportSingleRDOtoPDF, exportConsolidatedReportToPDF } from '../services/pdfExport';
import { exportLogsToCSV } from '../services/csvExport';

interface DailyOverviewProps {
  onViewLogDetail?: (log: DailyLog) => void;
  onEditLog?: (log: DailyLog) => void;
}

export const DailyOverview: React.FC<DailyOverviewProps> = ({ onViewLogDetail, onEditLog }) => {
  const { dailyLogs = [], teams = [], worksites = [] } = useData();
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [cityFilter, setCityFilter] = useState<string>('ALL');

  // Logs for this selected day
  const dayLogs = (dailyLogs || []).filter((l) => l && l.date === selectedDate);

  // Apply filters
  const filteredDayLogs = dayLogs.filter((log) => {
    if (cityFilter !== 'ALL' && log.city !== cityFilter) return false;
    return true;
  });

  // Unique cities on this day
  const availableCities = Array.from(new Set(dayLogs.map((l) => l.city).filter(Boolean)));

  // Daily statistics
  const totalTeamsWorking = filteredDayLogs.length;
  const totalWorkers = filteredDayLogs.reduce(
    (acc, log) => acc + 1 + ((log.helpersPresent || []).length || 0), // 1 leader + helpers
    0
  );
  const dayOccurrencesCount = filteredDayLogs.filter((l) => l && l.hasOccurrence).length;

  // Date stepper handlers
  const handlePrevDay = () => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleSetToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONCLUIDO_DIA':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            ✓ Concluído no Dia
          </span>
        );
      case 'EM_ANDAMENTO':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
            ⏳ Em Andamento
          </span>
        );
      case 'PARALISADO':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
            ⛔ Paralisado
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6" id="daily-overview-screen">
      {/* Top Header & Date Navigation */}
      <div className="bg-slate-900 text-white rounded-xl p-6 shadow-xs border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase bg-blue-600 text-white">
              Visão Operacional de Campo
            </span>
            <span className="text-xs text-slate-400">Atividades do Dia</span>
          </div>
          <h1 className="text-xl font-bold text-white mt-1">
            Distribuição e Atividades das Equipes
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Acompanhamento matinal e em tempo real de onde cada equipe está alocada, quem está em campo e serviços executados.
          </p>
        </div>

        {/* Date Selector & Stepper */}
        <div className="flex items-center space-x-2 bg-slate-800 p-1.5 rounded-xl border border-slate-700">
          <button
            onClick={handlePrevDay}
            className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors"
            title="Dia anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-slate-950 text-white text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-700 focus:outline-none"
          />

          <button
            onClick={handleNextDay}
            className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors"
            title="Próximo dia"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <button
            onClick={handleSetToday}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors"
          >
            Hoje
          </button>
        </div>
      </div>

      {/* Summary KPI Cards for the selected day */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Equipes em Campo</span>
            <HardHat className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{totalTeamsWorking}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">de {teams.length} equipes cadastradas</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Efetivo de Pessoal</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{totalWorkers}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">profissionais em atividade hoje</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Cidades Atendidas</span>
            <MapPin className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{availableCities.length}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">{availableCities.join(', ') || 'Nenhuma'}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Alertas / Ocorrências</span>
            <AlertTriangle className={`w-4 h-4 ${dayOccurrencesCount > 0 ? 'text-red-600 animate-pulse' : 'text-slate-400'}`} />
          </div>
          <p className={`text-2xl font-bold mt-2 ${dayOccurrencesCount > 0 ? 'text-red-600' : 'text-slate-900'}`}>
            {dayOccurrencesCount}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {dayOccurrencesCount > 0 ? 'Requer atenção imediata' : 'Operação sem falhas'}
          </p>
        </div>
      </div>

      {/* Action bar and filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <span className="text-xs font-bold text-slate-700 flex items-center">
            <Filter className="w-3.5 h-3.5 mr-1" />
            Filtrar Cidade:
          </span>
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="text-xs font-semibold px-3 py-1.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-800"
          >
            <option value="ALL">Todas as Cidades ({dayLogs.length})</option>
            {availableCities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
          <button
            onClick={() => exportConsolidatedReportToPDF(filteredDayLogs, `Dia ${selectedDate.split('-').reverse().join('/')}`)}
            disabled={filteredDayLogs.length === 0}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1 transition-colors disabled:opacity-50"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Exportar PDF do Dia</span>
          </button>
          <button
            onClick={() => exportLogsToCSV(filteredDayLogs, `atividades_${selectedDate}.csv`)}
            disabled={filteredDayLogs.length === 0}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-lg text-xs font-bold flex items-center space-x-1 transition-colors disabled:opacity-50"
          >
            <span>Excel / CSV</span>
          </button>
        </div>
      </div>

      {/* Main Requirement #5: Structured Distribution Hierarchy
          Equipe → Chefe de equipe → Ajudantes → Cidade → Obra → Serviço → Status */}
      <div className="space-y-4">
        {filteredDayLogs.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">
              Nenhuma equipe registrou atividade para {selectedDate.split('-').reverse().join('/')}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Utilize o botão de navegação acima para consultar dias anteriores ou registre um novo RDO para esta data.
            </p>
          </div>
        ) : (
          filteredDayLogs.map((log) => {
            return (
              <div
                key={log.id}
                id={`daily-card-${log.id}`}
                className="bg-white rounded-xl border border-slate-200 hover:border-slate-300 shadow-xs transition-colors overflow-hidden"
              >
                {/* Card Header with Team, Chefe, Status and Occurrence Flag */}
                <div className="bg-slate-900 text-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                      <HardHat className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-sm font-bold text-white">{log.teamName}</h3>
                        {log.hasOccurrence && (
                          <span className="px-2 py-0.5 bg-red-600 text-white text-[10px] font-extrabold rounded-full animate-pulse flex items-center">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Ocorrência Registrada
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-300 flex items-center space-x-1.5 mt-0.5">
                        <span>Chefe Responsável: <strong>{log.leaderName}</strong></span>
                        <span>•</span>
                        <span className="text-blue-300">{log.leaderPhone}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {getStatusBadge(log.status)}
                    <button
                      onClick={() => exportSingleRDOtoPDF(log)}
                      title="Gerar PDF RDO deste dia"
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs flex items-center space-x-1 border border-slate-700"
                    >
                      <FileDown className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">RDO PDF</span>
                    </button>
                    {onViewLogDetail && (
                      <button
                        onClick={() => onViewLogDetail(log)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-colors"
                      >
                        Ver Detalhes
                      </button>
                    )}
                  </div>
                </div>

                {/* Structured Horizontal Flow: Ajudantes → Cidade → Obra → Serviços */}
                <div className="p-5 grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50/50">
                  {/* Col 1: Ajudantes Presentes */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                      <span className="flex items-center">
                        <Users className="w-3.5 h-3.5 mr-1 text-blue-600" />
                        Ajudantes Presentes
                      </span>
                      <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded text-[10px] font-extrabold font-mono">
                        {String(log.helpersPresent?.length || 0).padStart(2, '0')}
                      </span>
                    </div>

                    <div className="space-y-1 pt-1">
                      {log.helpersPresent && log.helpersPresent.length > 0 ? (
                        log.helpersPresent.map((h) => (
                          <div key={h.id} className="text-xs text-slate-700 flex items-center justify-between">
                            <span className="font-medium text-slate-900">• {h.name}</span>
                            <span className="text-[10px] text-slate-500">{h.role || 'Ajudante'}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-400 italic">Apenas o chefe operando.</p>
                      )}
                    </div>
                  </div>

                  {/* Col 2: Cidade & Local */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                    <span className="flex items-center text-xs font-bold text-slate-800">
                      <MapPin className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                      Cidade e Localização
                    </span>
                    <p className="text-sm font-extrabold text-slate-900">
                      {log.city} / {log.state || 'PR'}
                    </p>
                    <p className="text-xs text-slate-600 leading-snug">
                      {log.worksiteLocationDetail || 'Trecho geral da obra'}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Horário: {log.workHours?.start || '07:30'} às {log.workHours?.end || '17:00'}
                    </p>
                  </div>

                  {/* Col 3: Obra / Projeto */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                    <span className="flex items-center text-xs font-bold text-slate-800">
                      <Building className="w-3.5 h-3.5 mr-1 text-purple-600" />
                      Obra / Contrato
                    </span>
                    <p className="text-xs font-bold text-slate-900 leading-tight">{log.worksiteName}</p>
                    <p className="text-xs text-slate-600 line-clamp-2">
                      {log.serviceDescription || 'Serviços de sinalização conforme cronograma.'}
                    </p>
                  </div>

                  {/* Col 4: Serviços Realizados (Tags) */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                    <span className="flex items-center text-xs font-bold text-slate-800">
                      <Layers className="w-3.5 h-3.5 mr-1 text-blue-600" />
                      Serviços Executados
                    </span>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {log.services.map((svc) => (
                        <span
                          key={svc}
                          className="px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded-md text-[11px] font-bold"
                        >
                          {svc}
                        </span>
                      ))}
                    </div>
                    {log.otherServiceDescription && (
                      <p className="text-[10px] text-slate-500 italic mt-1">
                        Outro: {log.otherServiceDescription}
                      </p>
                    )}
                  </div>
                </div>

                {/* Occurrence Banner inside card if present */}
                {log.hasOccurrence && log.occurrence && (
                  <div className="bg-red-50 border-t border-red-200 p-3.5 px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-start space-x-2">
                      <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <span className="font-bold text-red-950">
                          {log.occurrence.category}:
                        </span>{' '}
                        <span className="text-red-900">{log.occurrence.description}</span>
                        {log.occurrence.adminObservation && (
                          <div className="text-[11px] text-slate-700 font-medium mt-0.5">
                            ↳ Tratativa: {log.occurrence.adminObservation}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center space-x-2">
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                          log.occurrence.status === 'PENDENTE'
                            ? 'bg-red-600 text-white'
                            : log.occurrence.status === 'EM_ATENDIMENTO'
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-emerald-600 text-white'
                        }`}
                      >
                        {log.occurrence.status}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
