import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Wrench,
  Truck,
  PackageX,
  CloudRain,
  ShieldAlert,
  User,
  MapPin,
  Calendar,
  MessageSquare,
  ChevronRight,
  Filter,
  Check,
  Building,
  Mail,
} from 'lucide-react';
import { Occurrence, OccurrenceStatus } from '../types';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useGmail } from '../context/GmailContext';

interface OccurrencesAlertCenterProps {
  compact?: boolean;
  filterStatus?: 'ALL' | OccurrenceStatus;
  onNavigateTab?: (tab: string) => void;
}

export const OccurrencesAlertCenter: React.FC<OccurrencesAlertCenterProps> = ({
  compact = false,
  filterStatus = 'ALL',
  onNavigateTab,
}) => {
  const { occurrences = [], changeOccurrenceStatus } = useData();
  const { currentUser, isAdmin } = useAuth();
  const { openSendModalWithOccurrence } = useGmail();
  const [selectedOccurrence, setSelectedOccurrence] = useState<Occurrence | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | OccurrenceStatus>(filterStatus);
  const [searchTerm, setSearchTerm] = useState('');

  // Resolution modal state
  const [targetStatus, setTargetStatus] = useState<OccurrenceStatus>('EM_ATENDIMENTO');
  const [adminNote, setAdminNote] = useState('');
  const [assignedAdmin, setAssignedAdmin] = useState(currentUser?.name || 'Administrador');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredOccurrences = (occurrences || []).filter((occ) => {
    if (!occ) return false;
    if (statusFilter !== 'ALL' && occ.status !== statusFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchTeam = occ.teamName?.toLowerCase().includes(q);
      const matchLeader = occ.leaderName?.toLowerCase().includes(q);
      const matchCity = occ.city?.toLowerCase().includes(q);
      const matchWorksite = occ.worksiteName?.toLowerCase().includes(q);
      const matchCategory = occ.category?.toLowerCase().includes(q);
      const matchDesc = occ.description?.toLowerCase().includes(q);
      if (!matchTeam && !matchLeader && !matchCity && !matchWorksite && !matchCategory && !matchDesc) {
        return false;
      }
    }
    return true;
  });

  const pendingCount = occurrences.filter((o) => o.status === 'PENDENTE').length;
  const inProgressCount = occurrences.filter((o) => o.status === 'EM_ATENDIMENTO').length;
  const resolvedCount = occurrences.filter((o) => o.status === 'RESOLVIDO').length;

  const handleOpenActionModal = (occ: Occurrence) => {
    setSelectedOccurrence(occ);
    setTargetStatus(occ.status === 'PENDENTE' ? 'EM_ATENDIMENTO' : 'RESOLVIDO');
    setAdminNote(occ.adminObservation || '');
    setAssignedAdmin(occ.assignedAdminName || currentUser.name);
  };

  const handleSaveStatusUpdate = async () => {
    if (!selectedOccurrence) return;
    setIsSubmitting(true);
    try {
      await changeOccurrenceStatus(selectedOccurrence.id, targetStatus, adminNote, assignedAdmin);
      setSelectedOccurrence(null);
    } catch (err) {
      alert('Erro ao atualizar status da ocorrência');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    if (category.includes('veículo') || category.includes('caminhão')) return <Truck className="w-5 h-5 text-red-500" />;
    if (category.includes('máquina') || category.includes('ferramenta')) return <Wrench className="w-5 h-5 text-amber-500" />;
    if (category.includes('tinta') || category.includes('materiais') || category.includes('placas')) return <PackageX className="w-5 h-5 text-orange-500" />;
    if (category.includes('Chuva') || category.includes('climática')) return <CloudRain className="w-5 h-5 text-blue-500" />;
    return <ShieldAlert className="w-5 h-5 text-red-500" />;
  };

  const getStatusBadge = (status: OccurrenceStatus) => {
    switch (status) {
      case 'PENDENTE':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
            <span className="w-2 h-2 rounded-full bg-red-600 mr-1.5 animate-pulse" />
            🔴 Pendente
          </span>
        );
      case 'EM_ATENDIMENTO':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <span className="w-2 h-2 rounded-full bg-amber-500 mr-1.5" />
            🟡 Em atendimento
          </span>
        );
      case 'RESOLVIDO':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5" />
            🟢 Resolvido
          </span>
        );
    }
  };

  return (
    <div className="space-y-4" id="occurrences-alert-center">
      {/* Top Banner Alert when pending exist */}
      {pendingCount > 0 && compact && (
        <div className="bg-red-50 border border-red-300 rounded-xl p-4 shadow-xs animate-fade-in">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-red-600 text-white rounded-lg shadow-xs">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-bold text-red-950 flex items-center">
                  Ocorrências que precisam de atenção
                  <span className="ml-2 px-2 py-0.5 text-xs bg-red-600 text-white rounded-full font-bold">
                    {pendingCount} {pendingCount === 1 ? 'pendência crítica' : 'pendências críticas'}
                  </span>
                </h3>
                <p className="text-xs text-red-800 mt-0.5">
                  Identifique e tome providências imediatas em equipamentos avariados, veículos com problemas ou falta de materiais antes que impactem os próximos dias.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header controls (if full view) */}
      {!compact && (
        <>
          {onNavigateTab && (
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => onNavigateTab('dashboard')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold shadow-xs transition-colors"
                id="btn-occurrences-back-dashboard"
              >
                <span>← Voltar ao Painel</span>
              </button>
            </div>
          )}

          <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center">
                <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 mr-2" />
                Central de Ocorrências e Problemas
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500">
                Acompanhamento centralizado de chamados de manutenção, quebra de máquinas, veículos e materiais.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              {/* Status filters */}
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  statusFilter === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Todas ({occurrences.length})
              </button>
            <button
              onClick={() => setStatusFilter('PENDENTE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center ${
                statusFilter === 'PENDENTE' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-red-500 mr-1.5" />
              Pendentes ({pendingCount})
            </button>
            <button
              onClick={() => setStatusFilter('EM_ATENDIMENTO')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center ${
                statusFilter === 'EM_ATENDIMENTO' ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500 mr-1.5" />
              Em Atendimento ({inProgressCount})
            </button>
            <button
              onClick={() => setStatusFilter('RESOLVIDO')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center ${
                statusFilter === 'RESOLVIDO' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5" />
              Resolvidas ({resolvedCount})
            </button>
          </div>
        </div>
        </>
      )}

      {/* Occurrences List Cards */}
      <div className="space-y-3">
        {filteredOccurrences.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500 shadow-xs">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <h4 className="font-bold text-slate-800">Nenhuma ocorrência encontrada</h4>
            <p className="text-xs text-slate-500 mt-1">
              Todas as equipes estão com equipamentos e suprimentos regulares para este filtro.
            </p>
          </div>
        ) : (
          filteredOccurrences.map((occ) => {
            const isPending = occ.status === 'PENDENTE';
            const isInProgress = occ.status === 'EM_ATENDIMENTO';

            return (
              <div
                key={occ.id}
                id={`occurrence-card-${occ.id}`}
                className={`bg-white rounded-xl border transition-all shadow-xs p-4 ${
                  isPending
                    ? 'border-red-300 bg-red-50/20'
                    : isInProgress
                    ? 'border-amber-300 bg-amber-50/20'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  {/* Left content */}
                  <div className="flex items-start space-x-3">
                    <div className="p-2 rounded-lg bg-slate-100 border border-slate-200 mt-0.5">
                      {getCategoryIcon(occ.category)}
                    </div>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {getStatusBadge(occ.status)}
                        <span className="text-xs font-bold text-slate-900">{occ.teamName}</span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs text-slate-600 font-medium">{occ.category}</span>
                      </div>

                      {/* Problem Description highlighted */}
                      <p className="text-sm font-semibold text-slate-900 leading-snug">
                        {occ.description}
                      </p>

                      {/* Location & Metadata info */}
                      <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500 pt-1">
                        <div className="flex items-center space-x-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>{occ.city}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Building className="w-3.5 h-3.5 text-slate-400" />
                          <span>{occ.worksiteName}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>Chefe: {occ.leaderName} ({occ.leaderPhone})</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>Data: {occ.date.split('-').reverse().join('/')}</span>
                        </div>
                      </div>

                      {/* Admin Observation / Resolution note if exists */}
                      {occ.adminObservation && (
                        <div className="mt-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                          <div className="flex items-center space-x-1.5 font-bold text-slate-700 mb-0.5">
                            <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                            <span>Tratativa da Administração {occ.assignedAdminName ? `(${occ.assignedAdminName})` : ''}:</span>
                          </div>
                          <p className="text-slate-800">{occ.adminObservation}</p>
                          {occ.resolvedAt && (
                            <p className="text-[10px] text-emerald-700 font-semibold mt-1">
                              ✓ Resolvido em {new Date(occ.resolvedAt).toLocaleString('pt-BR')} por {occ.resolvedBy || 'Administrador'}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Action Button for Admins */}
                  <div className="sm:self-center shrink-0 flex items-center space-x-2">
                    <button
                      onClick={() => openSendModalWithOccurrence(occ)}
                      className="px-2.5 py-2 rounded-lg text-xs font-bold transition-colors flex items-center space-x-1 border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 shadow-2xs"
                      title="Enviar alerta desta ocorrência por Gmail"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Notificar por E-mail</span>
                    </button>

                    {isAdmin && (
                      <button
                        onClick={() => handleOpenActionModal(occ)}
                        className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors flex items-center space-x-1.5 shadow-xs ${
                          isPending
                            ? 'bg-red-600 hover:bg-red-700 text-white'
                            : isInProgress
                            ? 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        <Wrench className="w-3.5 h-3.5" />
                        <span>{isPending ? 'Atender' : isInProgress ? 'Atualizar' : 'Editar'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Action / Resolution Modal */}
      {selectedOccurrence && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start justify-between border-b pb-3 border-slate-100">
              <div>
                <span className="text-xs uppercase font-bold tracking-wider text-red-600">Tratativa de Ocorrência</span>
                <h3 className="text-base font-bold text-slate-900">{selectedOccurrence.category}</h3>
                <p className="text-xs text-slate-500">Equipe: {selectedOccurrence.teamName} | Cidade: {selectedOccurrence.city}</p>
              </div>
              <button
                onClick={() => setSelectedOccurrence(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-xs text-slate-800 space-y-1">
              <p className="font-bold text-red-900">Relato do Chefe de Equipe ({selectedOccurrence.leaderName}):</p>
              <p>{selectedOccurrence.description}</p>
            </div>

            {/* Status selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Alterar Status da Ocorrência:</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setTargetStatus('PENDENTE')}
                  className={`py-2 px-2 text-xs font-bold rounded-lg border text-center transition-colors ${
                    targetStatus === 'PENDENTE'
                      ? 'bg-red-600 text-white border-red-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-red-50'
                  }`}
                >
                  🔴 Pendente
                </button>
                <button
                  type="button"
                  onClick={() => setTargetStatus('EM_ATENDIMENTO')}
                  className={`py-2 px-2 text-xs font-bold rounded-lg border text-center transition-colors ${
                    targetStatus === 'EM_ATENDIMENTO'
                      ? 'bg-amber-500 text-slate-950 border-amber-500 font-bold shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-amber-50'
                  }`}
                >
                  🟡 Em Atendimento
                </button>
                <button
                  type="button"
                  onClick={() => setTargetStatus('RESOLVIDO')}
                  className={`py-2 px-2 text-xs font-bold rounded-lg border text-center transition-colors ${
                    targetStatus === 'RESOLVIDO'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-emerald-50'
                  }`}
                >
                  🟢 Resolvido
                </button>
              </div>
            </div>

            {/* Responsible Admin */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Responsável pelo Atendimento:</label>
              <input
                type="text"
                value={assignedAdmin}
                onChange={(e) => setAssignedAdmin(e.target.value)}
                placeholder="Nome do coordenador / almoxarife / mecânico"
                className="w-full text-xs px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Admin observation note */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Observação / Providência Tomada:
              </label>
              <textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                rows={3}
                placeholder="Ex.: Peça solicitada ao fornecedor; Guinchado para oficina AutoFix; Reposição de 10 latas de tinta enviada..."
                className="w-full text-xs p-3 border rounded-lg border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedOccurrence(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveStatusUpdate}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs transition-colors"
              >
                {isSubmitting ? 'Salvando...' : 'Salvar Tratativa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
