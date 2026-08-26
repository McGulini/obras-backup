import React, { useState } from 'react';
import {
  Building,
  Plus,
  Edit2,
  MapPin,
  Calendar,
  Layers,
  HardHat,
  History,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  FileText,
  User,
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Worksite, WorksiteStatus, STANDARD_SERVICES } from '../types';

interface WorksitesManagementProps {
  onNavigateTab?: (tab: string) => void;
}

export const WorksitesManagement: React.FC<WorksitesManagementProps> = ({ onNavigateTab }) => {
  const { worksites = [], addWorksite, editWorksite, teams = [], dailyLogs = [] } = useData();
  const { isAdmin } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | WorksiteStatus>('ALL');
  const [selectedWorksiteDetail, setSelectedWorksiteDetail] = useState<Worksite | null>(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingWorksite, setEditingWorksite] = useState<Worksite | null>(null);
  const [name, setName] = useState('');
  const [client, setClient] = useState('');
  const [city, setCity] = useState('Curitiba');
  const [state, setState] = useState('PR');
  const [address, setAddress] = useState('');
  const [defaultServices, setDefaultServices] = useState<string[]>(['Instalação de placas']);
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [forecastEndDate, setForecastEndDate] = useState('');
  const [status, setStatus] = useState<WorksiteStatus>('EM_ANDAMENTO');
  const [notes, setNotes] = useState('');

  const handleOpenModal = (worksite?: Worksite) => {
    if (worksite) {
      setEditingWorksite(worksite);
      setName(worksite.name);
      setClient(worksite.client);
      setCity(worksite.city);
      setState(worksite.state || 'PR');
      setAddress(worksite.address);
      setDefaultServices(worksite.defaultServices || []);
      setDescription(worksite.description);
      setStartDate(worksite.startDate);
      setForecastEndDate(worksite.forecastEndDate || '');
      setStatus(worksite.status);
      setNotes(worksite.notes || '');
    } else {
      setEditingWorksite(null);
      setName('');
      setClient('');
      setCity('Curitiba');
      setState('PR');
      setAddress('');
      setDefaultServices(['Instalação de placas', 'Pintura termoplástica']);
      setDescription('');
      setStartDate(new Date().toISOString().split('T')[0]);
      setForecastEndDate('');
      setStatus('EM_ANDAMENTO');
      setNotes('');
    }
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingWorksite) {
      await editWorksite(editingWorksite.id, {
        name,
        client,
        city,
        state,
        address,
        defaultServices,
        description,
        startDate,
        forecastEndDate,
        status,
        notes,
      });
    } else {
      await addWorksite({
        name,
        client,
        city,
        state,
        address,
        defaultServices,
        description,
        startDate,
        forecastEndDate,
        status,
        notes,
      });
    }
    setShowModal(false);
  };

  const toggleService = (svc: string) => {
    if (defaultServices.includes(svc)) {
      setDefaultServices((prev) => prev.filter((s) => s !== svc));
    } else {
      setDefaultServices((prev) => [...prev, svc]);
    }
  };

  const filteredWorksites = worksites.filter((w) => {
    if (statusFilter !== 'ALL' && w.status !== statusFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchName = w.name.toLowerCase().includes(q);
      const matchClient = w.client.toLowerCase().includes(q);
      const matchCity = w.city.toLowerCase().includes(q);
      if (!matchName && !matchClient && !matchCity) return false;
    }
    return true;
  });

  const getStatusBadge = (st: WorksiteStatus) => {
    switch (st) {
      case 'EM_ANDAMENTO':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
            Em Andamento
          </span>
        );
      case 'CONCLUIDA':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            Concluída
          </span>
        );
      case 'PLANEJAMENTO':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            Planejamento
          </span>
        );
      case 'PAUSADA':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-200 text-slate-700 border border-slate-300">
            Pausada
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6" id="worksites-management-screen">
      {/* Top Back Navigation Bar */}
      {onNavigateTab && (
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => onNavigateTab('dashboard')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold shadow-xs transition-colors"
            id="btn-worksites-back-dashboard"
          >
            <span>← Voltar ao Painel</span>
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-slate-900 text-white rounded-xl p-3.5 sm:p-6 shadow-xs border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase bg-blue-600 text-white">
              Contratos & Obras
            </span>
            <span className="text-[11px] sm:text-xs text-slate-400">Controle de Obras</span>
          </div>
          <h1 className="text-base sm:text-xl font-bold text-white mt-1">
            Cadastro e Acompanhamento de Obras
          </h1>
          <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
            Gerencie contratos, clientes, localização e visualize o histórico de todas as equipes que atuaram em cada obra.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => handleOpenModal()}
            className="px-3.5 py-2 sm:px-4 sm:py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center space-x-2 shadow-xs shrink-0 self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>+ Cadastrar Nova Obra</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nome da obra, cliente ou cidade..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              statusFilter === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Todas ({worksites.length})
          </button>
          <button
            onClick={() => setStatusFilter('EM_ANDAMENTO')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              statusFilter === 'EM_ANDAMENTO' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
            }`}
          >
            Em Andamento ({worksites.filter((w) => w.status === 'EM_ANDAMENTO').length})
          </button>
          <button
            onClick={() => setStatusFilter('CONCLUIDA')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              statusFilter === 'CONCLUIDA' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            Concluídas ({worksites.filter((w) => w.status === 'CONCLUIDA').length})
          </button>
        </div>
      </div>

      {/* Worksites Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredWorksites.map((worksite) => {
          // Logs for this worksite
          const siteLogs = dailyLogs.filter(
            (l) => l.worksiteId === worksite.id || l.worksiteName === worksite.name
          );
          // Distinct teams that worked here
          const teamsWorked = Array.from(new Set(siteLogs.map((l) => l.teamName)));

          return (
            <div
              key={worksite.id}
              id={`worksite-card-${worksite.id}`}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4 hover:border-slate-300 transition-colors flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    {getStatusBadge(worksite.status)}
                    <h3 className="text-base font-bold text-slate-900 mt-2 leading-snug">
                      {worksite.name}
                    </h3>
                    <p className="text-xs font-semibold text-blue-700 mt-0.5">
                      Cliente: {worksite.client}
                    </p>
                  </div>

                  {isAdmin && (
                    <button
                      onClick={() => handleOpenModal(worksite)}
                      className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
                      title="Editar obra"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="text-xs text-slate-600 space-y-1 pt-1">
                  <div className="flex items-center space-x-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>
                      {worksite.city}/{worksite.state || 'PR'} — {worksite.address || 'Trecho rodoviário'}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>
                      Início: {worksite.startDate?.split('-').reverse().join('/')}{' '}
                      {worksite.forecastEndDate ? `| Término: ${worksite.forecastEndDate.split('-').reverse().join('/')}` : ''}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-600 line-clamp-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  {worksite.description || 'Sem descrição cadastrada.'}
                </p>

                {/* Historical Teams that worked here */}
                <div className="space-y-1 text-xs">
                  <span className="font-bold text-slate-700 flex items-center">
                    <HardHat className="w-3.5 h-3.5 mr-1 text-slate-500" />
                    Equipes com Atuação Registrada:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {teamsWorked.map((t) => (
                      <span key={t} className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded-md text-[11px]">
                        {t}
                      </span>
                    ))}
                    {teamsWorked.length === 0 && (
                      <span className="text-slate-400 italic text-[11px]">Nenhuma atividade registrada ainda</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  <strong className="text-slate-900">{siteLogs.length}</strong> registros realizados
                </span>

                <button
                  onClick={() => setSelectedWorksiteDetail(worksite)}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700"
                >
                  Ver Histórico Completo →
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* WORKSITE DETAIL / HISTORY DRAWER MODAL */}
      {selectedWorksiteDetail && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-start justify-between border-b pb-4 border-slate-100">
              <div>
                <span className="text-xs uppercase font-bold tracking-wider text-blue-600">
                  Dossiê da Obra
                </span>
                <h2 className="text-lg font-bold text-slate-900">{selectedWorksiteDetail.name}</h2>
                <p className="text-xs text-slate-500">
                  Cliente: {selectedWorksiteDetail.client} | {selectedWorksiteDetail.city}/{selectedWorksiteDetail.state}
                </p>
              </div>
              <button
                onClick={() => setSelectedWorksiteDetail(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-2">
              <p><strong>Descrição do Contrato:</strong> {selectedWorksiteDetail.description}</p>
              <p><strong>Endereço / Extensão:</strong> {selectedWorksiteDetail.address}</p>
              <p><strong>Serviços Previstos:</strong> {selectedWorksiteDetail.defaultServices.join(', ')}</p>
              {selectedWorksiteDetail.notes && <p><strong>Observações:</strong> {selectedWorksiteDetail.notes}</p>}
            </div>

            {/* List of daily logs for this worksite */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center">
                <History className="w-4 h-4 text-blue-600 mr-1.5" />
                Histórico Cronológico de Atividades nesta Obra
              </h3>

              <div className="space-y-2.5">
                {dailyLogs
                  .filter(
                    (l) =>
                      l.worksiteId === selectedWorksiteDetail.id ||
                      l.worksiteName === selectedWorksiteDetail.name
                  )
                  .map((log) => (
                    <div key={log.id} className="p-3.5 bg-white border border-slate-200 rounded-xl text-xs space-y-1.5 shadow-2xs">
                      <div className="flex items-center justify-between font-bold text-slate-900">
                        <span className="flex items-center space-x-2">
                          <span className="px-2 py-0.5 bg-slate-900 text-white rounded text-[10px]">
                            {log.date.split('-').reverse().join('/')}
                          </span>
                          <span>{log.teamName} (Chefe {log.leaderName})</span>
                        </span>
                        <span className="text-emerald-700">{log.status}</span>
                      </div>
                      <p className="text-slate-700 font-medium">
                        Serviços: {log.services.join(', ')}
                      </p>
                      <p className="text-slate-500">
                        {log.serviceDescription}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Ajudantes presentes: {log.helpersPresent.map((h) => h.name).join(', ') || 'Apenas o chefe'}
                      </p>
                    </div>
                  ))}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setSelectedWorksiteDetail(null)}
                className="px-5 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors"
              >
                Fechar Dossiê
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT WORKSITE MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <form
            onSubmit={handleSave}
            className="bg-white rounded-xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingWorksite ? 'Editar Cadastro da Obra' : 'Cadastrar Nova Obra'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Nome da Obra / Contrato *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Obra Contorno Leste - BR-116"
                  className="w-full text-xs px-3 py-2 bg-slate-50 border rounded-lg border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Cliente / Órgão Contratante *</label>
                <input
                  type="text"
                  required
                  value={client}
                  onChange={(e) => setClient(e.target.value)}
                  placeholder="Ex: CCR RodoNorte, Prefeitura de Curitiba..."
                  className="w-full text-xs px-3 py-2 bg-slate-50 border rounded-lg border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Status da Obra</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as WorksiteStatus)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border rounded-lg border-slate-300 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="PLANEJAMENTO">Planejamento</option>
                  <option value="EM_ANDAMENTO">Em Andamento</option>
                  <option value="PAUSADA">Pausada</option>
                  <option value="CONCLUIDA">Concluída</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Cidade *</label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Curitiba"
                  className="w-full text-xs px-3 py-2 bg-slate-50 border rounded-lg border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Estado (UF)</label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="PR"
                  className="w-full text-xs px-3 py-2 bg-slate-50 border rounded-lg border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Endereço / Trecho</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Ex: Rodovia BR-277 do Km 35 ao Km 62"
                  className="w-full text-xs px-3 py-2 bg-slate-50 border rounded-lg border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Data de Início</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border rounded-lg border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Previsão de Término</label>
                <input
                  type="date"
                  value={forecastEndDate}
                  onChange={(e) => setForecastEndDate(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border rounded-lg border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tipos de Serviços Previstos:
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 bg-slate-50 rounded-lg border">
                  {STANDARD_SERVICES.map((svc) => {
                    const isSelected = defaultServices.includes(svc);
                    return (
                      <button
                        type="button"
                        key={svc}
                        onClick={() => toggleService(svc)}
                        className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                          isSelected
                            ? 'bg-blue-600 text-white font-bold'
                            : 'bg-white text-slate-700 border-slate-200'
                        }`}
                      >
                        {isSelected ? '✓ ' : ''}
                        {svc}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Descrição do Escopo</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva o escopo da obra..."
                  className="w-full text-xs p-2.5 bg-slate-50 border rounded-lg border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs transition-colors"
              >
                Salvar Obra
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
