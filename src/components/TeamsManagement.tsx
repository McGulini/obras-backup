import React, { useState, useMemo } from 'react';
import {
  Users,
  HardHat,
  Plus,
  Edit2,
  Phone,
  CheckCircle2,
  XCircle,
  UserCheck,
  UserX,
  Trash2,
  Search,
  Filter,
  Shield,
  Layers,
  AlertTriangle,
  X,
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Team, Helper } from '../types';

interface TeamsManagementProps {
  onNavigateTab?: (tab: string) => void;
}

export const TeamsManagement: React.FC<TeamsManagementProps> = ({ onNavigateTab }) => {
  const {
    teams = [],
    helpers = [],
    addTeam,
    editTeam,
    addHelper,
    editHelper,
    toggleHelperActive,
    removeHelper,
    dailyLogs = [],
    appointments = [],
  } = useData();
  const { isAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState<'TEAMS' | 'HELPERS'>('TEAMS');
  const [searchTerm, setSearchTerm] = useState('');
  const [helperFilterStatus, setHelperFilterStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Team Modal state
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [teamName, setTeamName] = useState('');
  const [leaderName, setLeaderName] = useState('');
  const [leaderPhone, setLeaderPhone] = useState('');
  const [defaultHelperIds, setDefaultHelperIds] = useState<string[]>([]);
  const [teamActive, setTeamActive] = useState(true);
  const [teamNotes, setTeamNotes] = useState('');

  // Helper Modal state
  const [showHelperModal, setShowHelperModal] = useState(false);
  const [editingHelper, setEditingHelper] = useState<Helper | null>(null);
  const [helperName, setHelperName] = useState('');
  const [helperRole, setHelperRole] = useState('Ajudante Geral');
  const [helperPhone, setHelperPhone] = useState('');
  const [helperActive, setHelperActive] = useState(true);

  // Helper Inactivation / Deletion states
  const [helperToToggleStatus, setHelperToToggleStatus] = useState<Helper | null>(null);
  const [helperToDelete, setHelperToDelete] = useState<Helper | null>(null);
  const [isProcessingHelper, setIsProcessingHelper] = useState(false);
  const [helperToastFeedback, setHelperToastFeedback] = useState<{
    type: 'success' | 'error' | 'warning';
    message: string;
  } | null>(null);

  // Open Team Modal
  const handleOpenTeamModal = (team?: Team) => {
    if (team) {
      setEditingTeam(team);
      setTeamName(team.name);
      setLeaderName(team.leaderName);
      setLeaderPhone(team.leaderPhone);
      setDefaultHelperIds(team.defaultHelperIds || []);
      setTeamActive(team.active);
      setTeamNotes(team.notes || '');
    } else {
      setEditingTeam(null);
      setTeamName('');
      setLeaderName('');
      setLeaderPhone('(41) 9');
      setDefaultHelperIds([]);
      setTeamActive(true);
      setTeamNotes('');
    }
    setShowTeamModal(true);
  };

  // Save Team
  const handleSaveTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim() || !leaderName.trim()) return;

    if (editingTeam) {
      await editTeam(editingTeam.id, {
        name: teamName,
        leaderName,
        leaderPhone,
        defaultHelperIds,
        active: teamActive,
        notes: teamNotes,
      });
    } else {
      await addTeam({
        name: teamName,
        leaderName,
        leaderPhone,
        defaultHelperIds,
        active: teamActive,
        notes: teamNotes,
      });
    }
    setShowTeamModal(false);
  };

  // Open Helper Modal
  const handleOpenHelperModal = (helper?: Helper) => {
    if (helper) {
      setEditingHelper(helper);
      setHelperName(helper.name);
      setHelperRole(helper.role);
      setHelperPhone(helper.phone || '');
      setHelperActive(helper.active);
    } else {
      setEditingHelper(null);
      setHelperName('');
      setHelperRole('Ajudante Geral');
      setHelperPhone('(41) 9');
      setHelperActive(true);
    }
    setShowHelperModal(true);
  };

  // Save Helper
  const handleSaveHelper = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!helperName.trim()) return;

    if (editingHelper) {
      await editHelper(editingHelper.id, {
        name: helperName,
        role: helperRole,
        phone: helperPhone,
        active: helperActive,
      });
    } else {
      await addHelper({
        name: helperName,
        role: helperRole,
        phone: helperPhone,
        active: helperActive,
      });
    }
    setShowHelperModal(false);
  };

  // Check helper history counts
  const getHelperHistoryCounts = (helper: Helper) => {
    const logCount = dailyLogs.filter((log) =>
      (log.helpers || []).some((h) => h.id === helper.id || h.name?.trim().toLowerCase() === helper.name?.trim().toLowerCase())
    ).length;
    const appointmentCount = appointments.filter((app) =>
      (app.helperIds || []).includes(helper.id)
    ).length;
    return {
      logCount,
      appointmentCount,
      total: logCount + appointmentCount,
    };
  };

  // Toggle helper active status (Desligar / Reativar)
  const handleConfirmToggleHelperStatus = async () => {
    if (!helperToToggleStatus) return;
    setIsProcessingHelper(true);
    try {
      const newStatus = !helperToToggleStatus.active;
      await toggleHelperActive(helperToToggleStatus.id, newStatus);
      setHelperToastFeedback({
        type: 'success',
        message: newStatus
          ? `Ajudante "${helperToToggleStatus.name}" foi reativado com sucesso e volta a constar na lista de ativos.`
          : `Ajudante "${helperToToggleStatus.name}" foi desligado/inativado. Seus registros históricos continuam preservados no sistema.`,
      });
      setHelperToToggleStatus(null);
      setTimeout(() => setHelperToastFeedback(null), 4500);
    } catch (err: any) {
      console.error('Erro ao alterar status do ajudante:', err);
      setHelperToastFeedback({
        type: 'error',
        message: err.message || 'Erro ao alterar status do ajudante.',
      });
      setTimeout(() => setHelperToastFeedback(null), 5000);
    } finally {
      setIsProcessingHelper(false);
    }
  };

  // Delete helper permanently (only if no history)
  const handleConfirmDeleteHelper = async () => {
    if (!helperToDelete) return;
    setIsProcessingHelper(true);
    try {
      await removeHelper(helperToDelete.id);
      setHelperToastFeedback({
        type: 'success',
        message: `Ajudante "${helperToDelete.name}" foi removido definitivamente do cadastro.`,
      });
      setHelperToDelete(null);
      setTimeout(() => setHelperToastFeedback(null), 4500);
    } catch (err: any) {
      console.error('Erro ao remover ajudante:', err);
      setHelperToastFeedback({
        type: 'error',
        message: err.message || 'Erro ao excluir ajudante.',
      });
      setTimeout(() => setHelperToastFeedback(null), 5000);
    } finally {
      setIsProcessingHelper(false);
    }
  };

  const toggleDefaultHelperSelection = (helperId: string) => {
    if (defaultHelperIds.includes(helperId)) {
      setDefaultHelperIds((prev) => prev.filter((id) => id !== helperId));
    } else {
      setDefaultHelperIds((prev) => [...prev, helperId]);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6" id="teams-management-screen">
      {/* Top Back Navigation Bar */}
      {onNavigateTab && (
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => onNavigateTab('dashboard')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold shadow-xs transition-colors"
            id="btn-teams-back-dashboard"
          >
            <span>← Voltar ao Painel</span>
          </button>
        </div>
      )}

      {/* Helper Toast Feedback */}
      {helperToastFeedback && (
        <div
          className={`p-3.5 sm:p-4 rounded-xl border flex items-center justify-between text-xs font-bold transition-all shadow-md ${
            helperToastFeedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : helperToastFeedback.type === 'warning'
              ? 'bg-amber-50 border-amber-300 text-amber-900'
              : 'bg-rose-50 border-rose-300 text-rose-900'
          }`}
          role="alert"
        >
          <div className="flex items-center space-x-2">
            {helperToastFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : helperToastFeedback.type === 'warning' ? (
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{helperToastFeedback.message}</span>
          </div>
          <button
            onClick={() => setHelperToastFeedback(null)}
            className="text-slate-400 hover:text-slate-700 p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Header */}
      <div className="bg-slate-900 text-white rounded-xl p-3.5 sm:p-6 shadow-xs border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase bg-blue-600 text-white">
              Gestão de Pessoal
            </span>
            <span className="text-[11px] sm:text-xs text-slate-400">Chefes, Equipes e Ajudantes</span>
          </div>
          <h1 className="text-base sm:text-xl font-bold text-white mt-1">
            Cadastro e Gerenciamento de Equipes de Campo
          </h1>
          <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
            Cadastre os chefes de equipe e o banco de ajudantes. A composição diária de ajudantes em cada obra é flexível e preserva o histórico de cada dia.
          </p>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center space-x-1.5 bg-slate-800 p-1 rounded-xl border border-slate-700 self-start md:self-auto">
          <button
            onClick={() => setActiveTab('TEAMS')}
            className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs font-bold transition-colors flex items-center space-x-1.5 ${
              activeTab === 'TEAMS' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-300 hover:bg-slate-700'
            }`}
          >
            <HardHat className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Equipes ({teams.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('HELPERS')}
            className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs font-bold transition-colors flex items-center space-x-1.5 ${
              activeTab === 'HELPERS' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Ajudantes ({helpers.length})</span>
          </button>
        </div>
      </div>

      {/* Action and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={activeTab === 'TEAMS' ? 'Buscar por equipe ou chefe...' : 'Buscar ajudante por nome ou função...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {isAdmin && (
          <button
            onClick={() => (activeTab === 'TEAMS' ? handleOpenTeamModal() : handleOpenHelperModal())}
            className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>{activeTab === 'TEAMS' ? '+ Nova Equipe & Chefe' : '+ Cadastrar Novo Ajudante'}</span>
          </button>
        )}
      </div>

      {/* TAB 1: TEAMS & LEADERS */}
      {activeTab === 'TEAMS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {teams
            .filter(
              (t) =>
                t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                t.leaderName.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .map((team) => {
              // Total RDOs registered by this team
              const teamLogsCount = dailyLogs.filter((l) => l.teamId === team.id).length;
              // Default helpers names
              const defaultHelpers = helpers.filter((h) => (team.defaultHelperIds || []).includes(h.id));

              return (
                <div
                  key={team.id}
                  id={`team-card-${team.id}`}
                  className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4 hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-900 text-blue-400 flex items-center justify-center font-bold shrink-0">
                        <HardHat className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="text-sm font-bold text-slate-900">{team.name}</h3>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              team.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {team.active ? 'Ativa' : 'Inativa'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5 flex items-center space-x-1">
                          <span>Chefe: <strong>{team.leaderName}</strong></span>
                          <span>•</span>
                          <span className="text-slate-500 flex items-center">
                            <Phone className="w-3 h-3 mr-0.5 text-slate-400" />
                            {team.leaderPhone}
                          </span>
                        </p>
                      </div>
                    </div>

                    {isAdmin && (
                      <button
                        onClick={() => handleOpenTeamModal(team)}
                        className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
                        title="Editar equipe"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Notes if any */}
                  {team.notes && (
                    <p className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      {team.notes}
                    </p>
                  )}

                  {/* Default Helpers Pool */}
                  <div className="space-y-1.5 pt-1 border-t border-slate-100">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700">Ajudantes Habituais / Padrão:</span>
                      <span className="text-slate-400 text-[10px]">{defaultHelpers.length} associados</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {defaultHelpers.map((h) => (
                        <span
                          key={h.id}
                          className="px-2 py-1 bg-slate-100 text-slate-800 border border-slate-200 rounded-md text-xs font-medium"
                        >
                          {h.name} <span className="text-slate-400 text-[10px]">({h.role})</span>
                        </span>
                      ))}
                      {defaultHelpers.length === 0 && (
                        <span className="text-xs text-slate-400 italic">Nenhum ajudante fixo vinculado.</span>
                      )}
                    </div>
                  </div>

                  {/* Footer Stats */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
                    <span>Total de registros de obras: <strong className="text-slate-900">{teamLogsCount}</strong></span>
                    <span className="text-[10px] text-slate-400">
                      Cadastrada em {new Date(team.createdAt).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* TAB 2: HELPERS DATABASE */}
      {activeTab === 'HELPERS' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Quadro Geral de Ajudantes e Colaboradores ({helpers.length})
              </h3>
              <p className="text-xs text-slate-500">
                Ajudantes ativos ficam disponíveis para novas equipes, escalas e RDOs. Ajudantes desligados têm seu histórico preservado.
              </p>
            </div>

            {/* Helper status filter buttons */}
            <div className="flex items-center space-x-1.5 bg-slate-200/60 p-1 rounded-lg self-start md:self-auto text-xs font-bold">
              <button
                type="button"
                onClick={() => setHelperFilterStatus('ALL')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  helperFilterStatus === 'ALL'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todos ({helpers.length})
              </button>
              <button
                type="button"
                onClick={() => setHelperFilterStatus('ACTIVE')}
                className={`px-3 py-1 rounded-md transition-colors flex items-center space-x-1 ${
                  helperFilterStatus === 'ACTIVE'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                <span>Ativos ({helpers.filter((h) => h.active !== false).length})</span>
              </button>
              <button
                type="button"
                onClick={() => setHelperFilterStatus('INACTIVE')}
                className={`px-3 py-1 rounded-md transition-colors flex items-center space-x-1 ${
                  helperFilterStatus === 'INACTIVE'
                    ? 'bg-slate-700 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-300'
                }`}
              >
                <span>Desligados ({helpers.filter((h) => h.active === false).length})</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Nome do Ajudante</th>
                  <th className="p-3.5">Função / Especialidade</th>
                  <th className="p-3.5">Telefone</th>
                  <th className="p-3.5">Histórico</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {helpers
                  .filter((h) => {
                    const matchesSearch =
                      h.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      h.role.toLowerCase().includes(searchTerm.toLowerCase());
                    if (!matchesSearch) return false;
                    if (helperFilterStatus === 'ACTIVE') return h.active !== false;
                    if (helperFilterStatus === 'INACTIVE') return h.active === false;
                    return true;
                  })
                  .map((helper) => {
                    const history = getHelperHistoryCounts(helper);
                    const isHelperActive = helper.active !== false;

                    return (
                      <tr key={helper.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3.5 font-bold text-slate-900">
                          <div className="flex items-center space-x-2">
                            <span>{helper.name}</span>
                            {!isHelperActive && (
                              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                Desligado
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded text-[11px] font-semibold">
                            {helper.role}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-600">{helper.phone || '-'}</td>
                        <td className="p-3.5">
                          <span className="text-[11px] text-slate-600">
                            <strong>{history.logCount}</strong> obras registradas
                            {history.appointmentCount > 0 && (
                              <span className="text-slate-400 block text-[10px]">
                                {history.appointmentCount} agendamentos
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              isHelperActive
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-300'
                            }`}
                          >
                            {isHelperActive ? '● Ativo' : '○ Desligado'}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          {isAdmin && (
                            <div className="flex items-center justify-end space-x-1">
                              <button
                                onClick={() => handleOpenHelperModal(helper)}
                                className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                                title="Editar dados cadastrais"
                                id={`btn-edit-helper-${helper.id}`}
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              {isHelperActive ? (
                                <button
                                  onClick={() => setHelperToToggleStatus(helper)}
                                  className="p-1.5 text-amber-600 hover:text-amber-700 rounded-lg hover:bg-amber-50 transition-colors"
                                  title="Desligar / Inativar Ajudante"
                                  id={`btn-inactivate-helper-${helper.id}`}
                                >
                                  <UserX className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => setHelperToToggleStatus(helper)}
                                  className="p-1.5 text-emerald-600 hover:text-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors"
                                  title="Reativar Ajudante"
                                  id={`btn-reactivate-helper-${helper.id}`}
                                >
                                  <UserCheck className="w-3.5 h-3.5" />
                                </button>
                              )}

                              <button
                                onClick={() => setHelperToDelete(helper)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                                title="Excluir do cadastro"
                                id={`btn-delete-helper-${helper.id}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TEAM EDIT / CREATE MODAL */}
      {showTeamModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <form
            onSubmit={handleSaveTeam}
            className="bg-white rounded-xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4"
          >
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingTeam ? 'Editar Cadastro da Equipe' : 'Cadastrar Nova Equipe & Chefe'}
              </h3>
              <button
                type="button"
                onClick={() => setShowTeamModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Nome / Identificação da Equipe *</label>
                <input
                  type="text"
                  required
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Ex: Equipe Alfa - Sinalização Vertical"
                  className="w-full text-xs px-3 py-2 bg-slate-50 border rounded-lg border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nome do Chefe de Equipe *</label>
                <input
                  type="text"
                  required
                  value={leaderName}
                  onChange={(e) => setLeaderName(e.target.value)}
                  placeholder="Ex: João da Silva"
                  className="w-full text-xs px-3 py-2 bg-slate-50 border rounded-lg border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Telefone / WhatsApp do Chefe</label>
                <input
                  type="text"
                  value={leaderPhone}
                  onChange={(e) => setLeaderPhone(e.target.value)}
                  placeholder="(41) 99988-1122"
                  className="w-full text-xs px-3 py-2 bg-slate-50 border rounded-lg border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ajudantes Habituais / Padrão (Padrão de sugestão):
                </label>
                <p className="text-[11px] text-slate-500 mb-2">
                  Selecione os ajudantes que geralmente acompanham este chefe. No dia a dia de campo, o chefe poderá alterar conforme os presentes.
                </p>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border p-2 rounded-lg bg-slate-50">
                  {helpers
                    .filter((h) => h.active !== false || defaultHelperIds.includes(h.id))
                    .map((h) => {
                      const isSelected = defaultHelperIds.includes(h.id);
                      return (
                        <button
                          type="button"
                          key={h.id}
                          onClick={() => toggleDefaultHelperSelection(h.id)}
                          className={`text-left p-2 rounded text-xs flex items-center space-x-2 border transition-colors ${
                            isSelected ? 'bg-slate-900 text-white font-bold' : 'bg-white text-slate-700'
                          }`}
                        >
                          <span>{isSelected ? '✓' : '○'}</span>
                          <span className="truncate">
                            {h.name} {h.active === false && <span className="text-[10px] text-amber-600">(Inativo)</span>}
                          </span>
                        </button>
                      );
                    })}
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Observações da Equipe</label>
                <textarea
                  rows={2}
                  value={teamNotes}
                  onChange={(e) => setTeamNotes(e.target.value)}
                  placeholder="Ex: Equipe equipada com caminhão guincho e perfuratriz..."
                  className="w-full text-xs p-2.5 bg-slate-50 border rounded-lg border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="team-active-chk"
                  checked={teamActive}
                  onChange={(e) => setTeamActive(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="team-active-chk" className="text-xs font-bold text-slate-800">
                  Equipe Ativa para Operação
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowTeamModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs transition-colors"
              >
                Salvar Equipe
              </button>
            </div>
          </form>
        </div>
      )}

      {/* HELPER EDIT / CREATE MODAL */}
      {showHelperModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <form
            onSubmit={handleSaveHelper}
            className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4"
          >
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingHelper ? 'Editar Dados do Ajudante' : 'Cadastrar Novo Ajudante'}
              </h3>
              <button
                type="button"
                onClick={() => setShowHelperModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={helperName}
                  onChange={(e) => setHelperName(e.target.value)}
                  placeholder="Ex: Carlos Andrade"
                  className="w-full text-xs px-3 py-2 bg-slate-50 border rounded-lg border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Função / Especialidade *</label>
                <input
                  type="text"
                  required
                  value={helperRole}
                  onChange={(e) => setHelperRole(e.target.value)}
                  placeholder="Ex: Pintor Especializado, Montador de Placas, Ajudante Geral"
                  className="w-full text-xs px-3 py-2 bg-slate-50 border rounded-lg border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Telefone / Contato</label>
                <input
                  type="text"
                  value={helperPhone}
                  onChange={(e) => setHelperPhone(e.target.value)}
                  placeholder="(41) 98801-0101"
                  className="w-full text-xs px-3 py-2 bg-slate-50 border rounded-lg border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="helper-active-chk"
                  checked={helperActive}
                  onChange={(e) => setHelperActive(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="helper-active-chk" className="text-xs font-bold text-slate-800">
                  Ajudante Ativo no Banco de Colaboradores
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowHelperModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs transition-colors"
              >
                Salvar Ajudante
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: INATIVAR / DESLIGAR / REATIVAR AJUDANTE */}
      {helperToToggleStatus && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div
              className={`p-5 border-b flex items-center justify-between ${
                helperToToggleStatus.active !== false
                  ? 'bg-amber-50/70 border-amber-100'
                  : 'bg-emerald-50/70 border-emerald-100'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                    helperToToggleStatus.active !== false
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {helperToToggleStatus.active !== false ? (
                    <UserX className="w-5 h-5" />
                  ) : (
                    <UserCheck className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    {helperToToggleStatus.active !== false
                      ? 'Desligar / Inativar Ajudante'
                      : 'Reativar Ajudante'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {helperToToggleStatus.active !== false
                      ? 'Retirar da escala ativa com preservação histórica'
                      : 'Disponibilizar para novas escalas e RDOs'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setHelperToToggleStatus(null)}
                disabled={isProcessingHelper}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <p className="text-slate-900 font-bold text-sm">{helperToToggleStatus.name}</p>
                <p className="text-slate-600 text-[11px]">{helperToToggleStatus.role}</p>
                {helperToToggleStatus.phone && (
                  <p className="text-slate-500 text-[10px]">Tel: {helperToToggleStatus.phone}</p>
                )}
              </div>

              {helperToToggleStatus.active !== false ? (
                <div className="space-y-2 text-slate-700">
                  <p className="font-medium">
                    Tem certeza que deseja registrar o desligamento de <strong>{helperToToggleStatus.name}</strong>?
                  </p>
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] space-y-1">
                    <p className="font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      Regras de Preservação e Segurança:
                    </p>
                    <ul className="list-disc pl-4 space-y-0.5 text-[10px] text-amber-800">
                      <li>O ajudante NÃO aparecerá para novas equipes ou novos agendamentos.</li>
                      <li>Ele NÃO poderá ser marcado em novos RDOs de campo.</li>
                      <li>Todos os relatórios e registros de obras anteriores continuam intactos.</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 text-slate-700">
                  <p className="font-medium">
                    Deseja reativar <strong>{helperToToggleStatus.name}</strong> no quadro de colaboradores ativos?
                  </p>
                  <p className="text-[11px] text-slate-500">
                    O ajudante voltará a constar na lista de seleção dos chefes de equipe para o registro de obras e novas escalas.
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setHelperToToggleStatus(null)}
                disabled={isProcessingHelper}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleConfirmToggleHelperStatus}
                disabled={isProcessingHelper}
                className={`px-4 py-2 text-white rounded-lg text-xs font-bold shadow-xs flex items-center space-x-1.5 transition-colors disabled:opacity-50 ${
                  helperToToggleStatus.active !== false
                    ? 'bg-amber-600 hover:bg-amber-500'
                    : 'bg-emerald-600 hover:bg-emerald-500'
                }`}
                id="btn-confirm-toggle-helper-status"
              >
                {isProcessingHelper ? (
                  <span>Processando...</span>
                ) : (
                  <>
                    {helperToToggleStatus.active !== false ? (
                      <>
                        <UserX className="w-3.5 h-3.5" />
                        <span>Confirmar Desligamento</span>
                      </>
                    ) : (
                      <>
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Reativar Ajudante</span>
                      </>
                    )}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EXCLUSÃO DE AJUDANTE */}
      {helperToDelete && (() => {
        const history = getHelperHistoryCounts(helperToDelete);
        const hasHistory = history.total > 0;

        return (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-rose-100 overflow-hidden">
              <div className="p-5 border-b border-rose-100 bg-rose-50/60 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold shrink-0">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900">
                      {hasHistory ? 'Exclusão Física Bloqueada' : 'Excluir Ajudante'}
                    </h3>
                    <p className="text-[11px] text-rose-700 font-medium">
                      {hasHistory ? 'Proteção de integridade dos RDOs' : 'Ação definitiva no cadastro'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setHelperToDelete(null)}
                  disabled={isProcessingHelper}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-3.5 text-xs">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                  <p className="text-slate-900 font-bold text-sm">{helperToDelete.name}</p>
                  <p className="text-slate-600 text-[11px]">{helperToDelete.role}</p>
                  <p className="text-[10px] text-slate-500">
                    Status Atual: <strong>{helperToDelete.active !== false ? 'Ativo' : 'Desligado/Inativo'}</strong>
                  </p>
                </div>

                {hasHistory ? (
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs space-y-2">
                    <p className="font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      Histórico Operacional Detectado
                    </p>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      O ajudante <strong>{helperToDelete.name}</strong> possui <strong>{history.logCount}</strong> obra(s) registrada(s) no Diário de Obras (RDO) e/ou <strong>{history.appointmentCount}</strong> agendamento(s).
                    </p>
                    <p className="text-[11px] text-amber-900 font-semibold leading-relaxed">
                      Para preservar a auditoria jurídica e os relatórios de obras, utilize a opção <strong>"Desligar / Inativar"</strong>. Ele não poderá ser usado em novos serviços, mas o histórico permanece protegido.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 text-slate-700">
                    <p className="font-medium">
                      Tem certeza que deseja excluir definitivamente o cadastro de <strong>{helperToDelete.name}</strong>?
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Como este ajudante não possui obras vinculadas, seu registro será removido permanentemente do banco de dados.
                    </p>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setHelperToDelete(null)}
                  disabled={isProcessingHelper}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Fechar
                </button>

                {hasHistory ? (
                  <button
                    type="button"
                    onClick={() => {
                      const helper = helperToDelete;
                      setHelperToDelete(null);
                      setHelperToToggleStatus(helper);
                    }}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold shadow-xs flex items-center space-x-1.5 transition-colors"
                    id="btn-switch-to-inactivate-helper"
                  >
                    <UserX className="w-3.5 h-3.5" />
                    <span>Desligar / Inativar Ajudante</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleConfirmDeleteHelper}
                    disabled={isProcessingHelper}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold shadow-xs flex items-center space-x-1.5 transition-colors disabled:opacity-50"
                    id="btn-confirm-delete-helper"
                  >
                    {isProcessingHelper ? (
                      <span>Excluindo...</span>
                    ) : (
                      <>
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Excluir Definitivamente</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
