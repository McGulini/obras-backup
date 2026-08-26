import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Search,
  Filter,
  Users,
  Building,
  MapPin,
  Layers,
  AlertTriangle,
  FileDown,
  Printer,
  ChevronDown,
  ChevronUp,
  HardHat,
  X,
  FileSpreadsheet,
  Eye,
  Mail,
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useGmail } from '../context/GmailContext';
import { DailyLog, STANDARD_SERVICES } from '../types';
import { exportSingleRDOtoPDF, exportConsolidatedReportToPDF } from '../services/pdfExport';
import { exportLogsToCSV } from '../services/csvExport';

interface HistoryAndFilterProps {
  onSelectLogDetail?: (log: DailyLog) => void;
  onNavigateTab?: (tab: string) => void;
}

export const HistoryAndFilter: React.FC<HistoryAndFilterProps> = ({
  onSelectLogDetail,
  onNavigateTab,
}) => {
  const { dailyLogs = [], teams = [], worksites = [] } = useData();
  const { openSendModalWithRdo } = useGmail();

  // Filters state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('ALL');
  const [selectedLeader, setSelectedLeader] = useState('ALL');
  const [selectedCity, setSelectedCity] = useState('ALL');
  const [selectedWorksite, setSelectedWorksite] = useState('ALL');
  const [selectedService, setSelectedService] = useState('ALL');
  const [occurrenceOnly, setOccurrenceOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Selected Log for quick modal view
  const [modalLog, setModalLog] = useState<DailyLog | null>(null);

  // Distinct values for select dropdowns
  const availableLeaders = useMemo(() => {
    return Array.from(new Set((dailyLogs || []).map((l) => l.leaderName).filter(Boolean)));
  }, [dailyLogs]);

  const availableCities = useMemo(() => {
    return Array.from(new Set(dailyLogs.map((l) => l.city)));
  }, [dailyLogs]);

  const availableWorksites = useMemo(() => {
    return Array.from(new Set(dailyLogs.map((l) => l.worksiteName)));
  }, [dailyLogs]);

  // Filter application
  const filteredLogs = useMemo(() => {
    return dailyLogs.filter((log) => {
      // Date range
      if (startDate && log.date < startDate) return false;
      if (endDate && log.date > endDate) return false;

      // Team
      if (selectedTeamId !== 'ALL' && log.teamId !== selectedTeamId) return false;

      // Leader
      if (selectedLeader !== 'ALL' && log.leaderName !== selectedLeader) return false;

      // City
      if (selectedCity !== 'ALL' && log.city !== selectedCity) return false;

      // Worksite
      if (selectedWorksite !== 'ALL' && log.worksiteName !== selectedWorksite) return false;

      // Service
      if (selectedService !== 'ALL' && !log.services.includes(selectedService)) return false;

      // Occurrence only
      if (occurrenceOnly && !log.hasOccurrence) return false;

      // Free search
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchText =
          log.teamName.toLowerCase().includes(q) ||
          log.leaderName.toLowerCase().includes(q) ||
          log.city.toLowerCase().includes(q) ||
          log.worksiteName.toLowerCase().includes(q) ||
          log.serviceDescription.toLowerCase().includes(q) ||
          log.services.some((s) => s.toLowerCase().includes(q)) ||
          log.helpersPresent.some((h) => h.name.toLowerCase().includes(q));
        if (!matchText) return false;
      }

      return true;
    });
  }, [
    dailyLogs,
    startDate,
    endDate,
    selectedTeamId,
    selectedLeader,
    selectedCity,
    selectedWorksite,
    selectedService,
    occurrenceOnly,
    searchTerm,
  ]);

  const clearAllFilters = () => {
    setStartDate('');
    setEndDate('');
    setSelectedTeamId('ALL');
    setSelectedLeader('ALL');
    setSelectedCity('ALL');
    setSelectedWorksite('ALL');
    setSelectedService('ALL');
    setOccurrenceOnly(false);
    setSearchTerm('');
  };

  const hasActiveFilters =
    startDate ||
    endDate ||
    selectedTeamId !== 'ALL' ||
    selectedLeader !== 'ALL' ||
    selectedCity !== 'ALL' ||
    selectedWorksite !== 'ALL' ||
    selectedService !== 'ALL' ||
    occurrenceOnly ||
    searchTerm;

  return (
    <div className="space-y-6" id="history-filter-screen">
      {/* Top Header */}
      <div className="bg-slate-900 text-white rounded-xl p-6 shadow-xs border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase bg-blue-600 text-white">
              Consulta Avançada
            </span>
            <span className="text-xs text-slate-400">Histórico de Registros de Campo</span>
          </div>
          <h1 className="text-xl font-bold text-white mt-1">
            Histórico e Filtros de RDOs
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Pesquise registros por data, chefe, equipe, cidade, obra, tipo de serviço e ocorrências.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => exportConsolidatedReportToPDF(filteredLogs, 'Relatório Filtrado')}
            disabled={filteredLogs.length === 0}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors border border-slate-700 disabled:opacity-50"
          >
            <FileDown className="w-4 h-4 text-blue-400" />
            <span>Exportar PDF</span>
          </button>
          <button
            onClick={() => exportLogsToCSV(filteredLogs, 'historico_rdo_filtrado.csv')}
            disabled={filteredLogs.length === 0}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-xs disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exportar Excel/CSV</span>
          </button>
        </div>
      </div>

      {/* FILTER CONTROLS PANEL */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b pb-3 border-slate-100">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-blue-600" />
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Painel de Filtros Parametrizados
            </h2>
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="text-xs font-bold text-red-600 hover:underline flex items-center space-x-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>Limpar Todos os Filtros</span>
            </button>
          )}
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Data Início e Fim */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Data Início</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full text-xs px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Data Término</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full text-xs px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Equipe */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Equipe</label>
            <select
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
              className="w-full text-xs px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Todas as Equipes</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Chefe de Equipe */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Chefe de Equipe</label>
            <select
              value={selectedLeader}
              onChange={(e) => setSelectedLeader(e.target.value)}
              className="w-full text-xs px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Todos os Chefes</option>
              {availableLeaders.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>

          {/* Cidade */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Cidade</label>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full text-xs px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Todas as Cidades</option>
              {availableCities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Obra */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Obra / Projeto</label>
            <select
              value={selectedWorksite}
              onChange={(e) => setSelectedWorksite(e.target.value)}
              className="w-full text-xs px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Todas as Obras</option>
              {availableWorksites.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </div>

          {/* Tipo de Serviço */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Tipo de Serviço</label>
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              className="w-full text-xs px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Todos os Serviços</option>
              {STANDARD_SERVICES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Ocorrências Toggle & Search */}
          <div className="flex flex-col justify-end">
            <label className="flex items-center space-x-2 p-2 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={occurrenceOnly}
                onChange={(e) => setOccurrenceOnly(e.target.checked)}
                className="rounded text-red-600 focus:ring-red-500"
              />
              <span className="text-xs font-bold text-red-900">
                Apenas c/ Ocorrências 🚨
              </span>
            </label>
          </div>
        </div>

        {/* Free search bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Pesquisar por ajudante, descrição de serviços, placas, equipamentos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* RESULTS COUNT */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>
          Encontrados <strong className="text-slate-900">{filteredLogs.length}</strong> registros correspondentes
        </span>
        {hasActiveFilters && (
          <span className="text-blue-700 font-semibold">
            (Filtros ativos aplicados)
          </span>
        )}
      </div>

      {/* TABLE OF LOGS */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3.5">Data</th>
                <th className="p-3.5">Equipe / Chefe</th>
                <th className="p-3.5">Ajudantes Preservados</th>
                <th className="p-3.5">Cidade & Obra</th>
                <th className="p-3.5">Serviços Realizados</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    Nenhum registro encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => setModalLog(log)}
                  >
                    {/* Data */}
                    <td className="p-3.5 font-bold text-slate-900 whitespace-nowrap">
                      {log.date.split('-').reverse().join('/')}
                    </td>

                    {/* Equipe / Chefe */}
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900">{log.teamName}</div>
                      <div className="text-[11px] text-slate-500">Chefe: {log.leaderName}</div>
                    </td>

                    {/* Ajudantes */}
                    <td className="p-3.5">
                      <div className="max-w-xs">
                        <span className="font-semibold text-slate-800">
                          {log.helpersPresent?.map((h) => h.name.split(' ')[0]).join(', ') || 'Nenhum'}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          ({log.helpersPresent?.length || 0} ajudantes)
                        </span>
                      </div>
                    </td>

                    {/* Cidade & Obra */}
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900">{log.city}</div>
                      <div className="text-[11px] text-slate-600 line-clamp-1">{log.worksiteName}</div>
                    </td>

                    {/* Serviços */}
                    <td className="p-3.5">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {log.services.map((svc) => (
                          <span
                            key={svc}
                            className="px-1.5 py-0.5 bg-blue-50 text-blue-900 border border-blue-200 rounded text-[10px] font-semibold"
                          >
                            {svc}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Status & Alerta */}
                    <td className="p-3.5">
                      <div className="space-y-1">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            log.status === 'CONCLUIDO_DIA'
                              ? 'bg-emerald-100 text-emerald-800'
                              : log.status === 'EM_ANDAMENTO'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {log.status === 'CONCLUIDO_DIA' ? 'Concluído' : log.status}
                        </span>

                        {log.hasOccurrence && (
                          <span className="block text-[9px] font-bold text-red-600">
                            🚨 OCORRÊNCIA
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Ações */}
                    <td className="p-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end space-x-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => openSendModalWithRdo(log)}
                          className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                          title="Enviar RDO via Gmail"
                        >
                          <Mail className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => exportSingleRDOtoPDF(log)}
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded transition-colors"
                          title="Baixar RDO em PDF"
                        >
                          <FileDown className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setModalLog(log)}
                          className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-bold flex items-center space-x-1 transition-colors"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Ver</span>
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

      {/* RDO DETAIL MODAL */}
      {modalLog && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-start justify-between border-b pb-3 border-slate-100">
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-blue-600 text-white">
                  Registro Diário de Obra (RDO)
                </span>
                <h2 className="text-lg font-bold text-slate-900 mt-1">
                  {modalLog.teamName} — {modalLog.date.split('-').reverse().join('/')}
                </h2>
                <p className="text-xs text-slate-500">
                  Chefe de Equipe: <strong>{modalLog.leaderName}</strong> ({modalLog.leaderPhone})
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => exportSingleRDOtoPDF(modalLog)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1 transition-colors shadow-xs"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>PDF RDO</span>
                </button>
                <button
                  onClick={() => setModalLog(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 text-base font-bold"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Local and Scope */}
            <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl text-xs">
              <div>
                <p className="text-slate-400 text-[10px] uppercase font-bold">Obra</p>
                <p className="font-bold text-slate-900">{modalLog.worksiteName}</p>
                <p className="text-slate-600">{modalLog.city}/{modalLog.state || 'PR'}</p>
                {modalLog.worksiteLocationDetail && (
                  <p className="text-slate-500 mt-0.5">Trecho: {modalLog.worksiteLocationDetail}</p>
                )}
              </div>

              <div>
                <p className="text-slate-400 text-[10px] uppercase font-bold">Status e Clima</p>
                <p className="font-bold text-slate-900">{modalLog.status}</p>
                <p className="text-slate-600">Clima: {modalLog.weather || 'Ensolarado'}</p>
                <p className="text-slate-500 mt-0.5">
                  Horário: {modalLog.workHours?.start} às {modalLog.workHours?.end}
                </p>
              </div>
            </div>

            {/* Ajudantes presentes salvos */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Ajudantes Presentes neste dia ({modalLog.helpersPresent?.length || 0}):
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {modalLog.helpersPresent?.map((h) => (
                  <div key={h.id} className="p-2 bg-slate-100 rounded-lg text-xs flex justify-between">
                    <span className="font-bold text-slate-800">{h.name}</span>
                    <span className="text-[10px] text-slate-500">{h.role || 'Ajudante'}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Services */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Serviços Realizados:
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {modalLog.services.map((s) => (
                  <span key={s} className="px-2.5 py-1 bg-blue-50 text-blue-900 border border-blue-200 font-bold rounded-lg text-xs">
                    {s}
                  </span>
                ))}
              </div>
              <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200 mt-2">
                {modalLog.serviceDescription}
              </p>
            </div>

            {/* Occurrences if any */}
            {modalLog.hasOccurrence && modalLog.occurrence && (
              <div className="p-4 bg-red-50 rounded-xl border border-red-300 space-y-1 text-xs">
                <div className="flex items-center space-x-1.5 font-bold text-red-950">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span>Ocorrência: {modalLog.occurrence.category} ({modalLog.occurrence.urgency})</span>
                </div>
                <p className="text-red-900">{modalLog.occurrence.description}</p>
                {modalLog.occurrence.adminObservation && (
                  <p className="text-slate-800 font-semibold pt-1 border-t border-red-200">
                    Tratativa Administrativa: {modalLog.occurrence.adminObservation}
                  </p>
                )}
              </div>
            )}

            {/* Photos */}
            {modalLog.photos && modalLog.photos.length > 0 && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Fotos da Obra ({modalLog.photos.length}):
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {modalLog.photos.map((p) => (
                    <div key={p.id} className="rounded-lg overflow-hidden border border-slate-200 bg-slate-100 aspect-video">
                      <img src={p.url} alt="Foto da obra" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  const current = modalLog;
                  setModalLog(null);
                  openSendModalWithRdo(current);
                }}
                className="px-3.5 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center space-x-1.5 shadow-xs"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Transmitir RDO via Gmail</span>
              </button>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => exportSingleRDOtoPDF(modalLog)}
                  className="px-3 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors flex items-center space-x-1"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Baixar PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModalLog(null)}
                  className="px-5 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
