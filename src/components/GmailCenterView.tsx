import React, { useState, useEffect } from 'react';
import {
  Mail,
  Send,
  RefreshCw,
  FileText,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  LogOut,
  UserCheck,
  Clock,
  Search,
  Plus,
  Building,
  HardHat,
  Eye,
  Inbox,
  Sparkles,
} from 'lucide-react';
import { useGmail } from '../context/GmailContext';
import { useData } from '../context/DataContext';
import { GmailMessageSummary } from '../services/gmailService';

interface GmailCenterViewProps {
  onNavigateTab?: (tab: string) => void;
}

export const GmailCenterView: React.FC<GmailCenterViewProps> = ({ onNavigateTab }) => {
  const {
    isConnected,
    googleUser,
    gmailProfile,
    isLoading,
    sentMessages,
    connectGoogle,
    disconnectGoogle,
    refreshSentMessages,
    openCustomSendModal,
    openSendModalWithRdo,
    openSendModalWithOccurrence,
  } = useGmail();

  const { dailyLogs = [], occurrences = [], worksites = [] } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedSentMessage, setSelectedSentMessage] = useState<GmailMessageSummary | null>(null);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshSentMessages();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const filteredSent = (sentMessages || []).filter((msg) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      msg.subject.toLowerCase().includes(q) ||
      msg.to.toLowerCase().includes(q) ||
      msg.snippet.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4 sm:space-y-6" id="gmail-center-screen">
      {/* Top Back Navigation */}
      {onNavigateTab && (
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => onNavigateTab('dashboard')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold shadow-xs transition-colors"
            id="btn-gmail-back-dashboard"
          >
            <span>← Voltar ao Painel</span>
          </button>
        </div>
      )}

      {/* Main Header Banner */}
      <div className="bg-slate-900 text-white rounded-xl p-4 sm:p-6 shadow-xs border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase bg-red-600 text-white">
              Google Workspace
            </span>
            <span className="text-[11px] sm:text-xs text-slate-400">Integração Gmail Oficial</span>
          </div>
          <h1 className="text-base sm:text-xl font-bold text-white mt-1 flex items-center">
            <Mail className="w-5 h-5 text-red-500 mr-2" />
            Central de Comunicações & E-mails (Gmail)
          </h1>
          <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
            Transmita Relatórios de Obras, alertas operacionais e comunicados aos clientes diretamente através da sua conta Google corporativa.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isConnected ? (
            <>
              <button
                onClick={() => openCustomSendModal()}
                className="px-3.5 py-2 sm:px-4 sm:py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center space-x-2 shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>+ Escrever Novo E-mail</span>
              </button>
              <button
                onClick={disconnectGoogle}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors flex items-center space-x-1.5 border border-slate-700"
                title="Desconectar conta Google"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Desconectar</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => connectGoogle()}
              className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-900 rounded-lg text-xs font-bold transition-colors flex items-center space-x-2 shadow-xs"
            >
              <svg className="w-4 h-4" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                <path fill="none" d="M0 0h48v48H0z"></path>
              </svg>
              <span>Conectar Conta Google</span>
            </button>
          )}
        </div>
      </div>

      {/* Connection Status Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold ${
              isConnected
                ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                : 'bg-slate-100 text-slate-500 border border-slate-200'
            }`}
          >
            {isConnected ? <ShieldCheck className="w-6 h-6" /> : <Mail className="w-6 h-6" />}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-bold text-slate-900">
                {isConnected ? 'Conta Google Autenticada' : 'Integração Google Workspace Desconectada'}
              </h2>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                  isConnected ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {isConnected ? 'Ativo' : 'Offline'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {isConnected
                ? `E-mail conectado: ${gmailProfile?.emailAddress || googleUser?.email || 'obras.tottal@gmail.com'}`
                : 'Conecte sua conta do Google para habilitar a transmissão direta de e-mails, relatórios e alertas.'}
            </p>
          </div>
        </div>

        {isConnected && gmailProfile && (
          <div className="flex items-center space-x-4 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 text-xs">
            <div className="text-center">
              <span className="block font-bold text-slate-800 text-sm">{gmailProfile.messagesTotal || 0}</span>
              <span className="text-[10px] text-slate-500 uppercase">Mensagens na Caixa</span>
            </div>
            <div className="h-6 w-px bg-slate-300" />
            <div className="text-center">
              <span className="block font-bold text-slate-800 text-sm">{sentMessages.length}</span>
              <span className="text-[10px] text-slate-500 uppercase">Enviados Recentes</span>
            </div>
          </div>
        )}
      </div>

      {/* QUICK DISPATCH SECTION (Transmitir Relatórios de Obras recentes ou Alertas) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Card 1: Últimos Relatórios de Obras para Envio */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Transmitir Relatórios de Obra via Gmail
              </h3>
            </div>
            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab('history')}
                className="text-[11px] font-bold text-blue-600 hover:underline"
              >
                Ver todos os Registros de Obra →
              </button>
            )}
          </div>

          <p className="text-xs text-slate-500">
            Selecione uma obra recente para enviar o relatório formatado em HTML com metragens e efetivo por e-mail:
          </p>

          <div className="space-y-2">
            {(dailyLogs || []).slice(0, 3).map((log) => (
              <div
                key={log.id}
                className="p-2.5 rounded-lg border border-slate-100 bg-slate-50 hover:bg-blue-50/50 hover:border-blue-200 transition-colors flex items-center justify-between gap-2"
              >
                <div>
                  <div className="flex items-center space-x-1.5">
                    <span className="text-xs font-bold text-slate-900">{log.worksiteName || 'Obra'}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">
                      {log.date.split('-').reverse().join('/')}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {log.teamName} • Chefe: {log.leaderName}
                  </p>
                </div>

                <button
                  onClick={() => openSendModalWithRdo(log)}
                  className="px-2.5 py-1.5 bg-white hover:bg-blue-600 hover:text-white border border-slate-200 hover:border-blue-600 text-slate-700 text-xs font-bold rounded-lg transition-colors flex items-center space-x-1 shrink-0 shadow-2xs"
                >
                  <Send className="w-3 h-3" />
                  <span>Enviar E-mail</span>
                </button>
              </div>
            ))}

            {dailyLogs.length === 0 && (
              <p className="text-xs text-slate-400 italic text-center py-3">
                Nenhum relatório diário registrado ainda.
              </p>
            )}
          </div>
        </div>

        {/* Card 2: Alertas Críticos de Campo */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Notificar Ocorrências Críticas
              </h3>
            </div>
            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab('occurrences')}
                className="text-[11px] font-bold text-red-600 hover:underline"
              >
                Ver Central de Ocorrências →
              </button>
            )}
          </div>

          <p className="text-xs text-slate-500">
            Envie alertas imediatos para a manutenção, engenharia ou diretoria sobre máquinas ou veículos quebrados:
          </p>

          <div className="space-y-2">
            {(occurrences || [])
              .filter((o) => o.status !== 'RESOLVIDO')
              .slice(0, 3)
              .map((occ) => (
                <div
                  key={occ.id}
                  className="p-2.5 rounded-lg border border-red-100 bg-red-50/40 hover:bg-red-50 transition-colors flex items-center justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-1.5 truncate">
                      <span className="text-xs font-bold text-red-950 truncate">{occ.category}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-600 text-white font-bold shrink-0">
                        {occ.urgency}
                      </span>
                    </div>
                    <p className="text-[11px] text-red-800 truncate mt-0.5">
                      {occ.teamName} • {occ.city}
                    </p>
                  </div>

                  <button
                    onClick={() => openSendModalWithOccurrence(occ)}
                    className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center space-x-1 shrink-0 shadow-2xs"
                  >
                    <Send className="w-3 h-3" />
                    <span>Notificar</span>
                  </button>
                </div>
              ))}

            {occurrences.filter((o) => o.status !== 'RESOLVIDO').length === 0 && (
              <div className="p-3 bg-emerald-50 rounded-lg text-xs text-emerald-800 font-semibold text-center">
                ✅ Nenhuma ocorrência pendente em campo no momento.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* SENT EMAILS FEED SECTION */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <Send className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900">
              Histórico de Mensagens Enviadas (Gmail)
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold">
              {sentMessages.length}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <div className="relative w-full sm:w-60">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filtrar enviados..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <button
              onClick={handleRefresh}
              disabled={isRefreshing || !isConnected}
              className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors disabled:opacity-50"
              title="Atualizar lista de enviados"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* Message List */}
        {!isConnected ? (
          <div className="text-center py-8 text-slate-400 space-y-2">
            <Mail className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-xs">Conecte sua conta Google acima para visualizar o histórico de e-mails enviados.</p>
          </div>
        ) : filteredSent.length === 0 ? (
          <div className="text-center py-8 text-slate-400 space-y-2">
            <Inbox className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-xs font-medium">Nenhum e-mail recente encontrado nos registros do Gmail.</p>
            <p className="text-[11px] text-slate-400">Use os botões de envio acima para transmitir relatórios diários de obras.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredSent.map((msg) => (
              <div
                key={msg.id}
                className="py-3 px-2 hover:bg-slate-50 rounded-lg transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-slate-900 truncate">
                      {msg.subject || '(Sem Assunto)'}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                      Para: {msg.to || 'Destinatário'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">
                    {msg.snippet}
                  </p>
                </div>

                <div className="flex items-center space-x-3 text-xs text-slate-400 shrink-0 self-end sm:self-center">
                  <span className="text-[11px] flex items-center">
                    <Clock className="w-3 h-3 mr-1 text-slate-400" />
                    {msg.date ? new Date(msg.date).toLocaleDateString('pt-BR') : ''}
                  </span>
                  <button
                    onClick={() => setSelectedSentMessage(msg)}
                    className="px-2 py-1 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded text-[11px] font-bold transition-colors"
                  >
                    Ver Detalhes
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Message Details Modal */}
      {selectedSentMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-900">Detalhes da Mensagem</h3>
              <button
                onClick={() => setSelectedSentMessage(null)}
                className="text-slate-400 hover:text-slate-700 text-xs font-bold"
              >
                ✕ Fechar
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <span className="text-slate-500 font-semibold">Assunto:</span>
                <p className="font-bold text-slate-900 mt-0.5">{selectedSentMessage.subject}</p>
              </div>
              <div>
                <span className="text-slate-500 font-semibold">Destinatário:</span>
                <p className="font-mono text-slate-800 mt-0.5">{selectedSentMessage.to}</p>
              </div>
              <div>
                <span className="text-slate-500 font-semibold">Data:</span>
                <p className="text-slate-700 mt-0.5">{selectedSentMessage.date}</p>
              </div>
              <div>
                <span className="text-slate-500 font-semibold">Trecho da Mensagem:</span>
                <p className="text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200 mt-0.5 text-xs leading-relaxed">
                  {selectedSentMessage.snippet}
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedSentMessage(null)}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
