import React, { useState, useEffect } from 'react';
import {
  Mail,
  Send,
  FileText,
  CheckCircle2,
  AlertTriangle,
  X,
  Eye,
  Edit3,
  Loader2,
  Users,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import { useGmail } from '../context/GmailContext';

const QUICK_RECIPIENTS = [
  { label: 'Administração Geral', email: 'obras.tottal@gmail.com' },
  { label: 'Diretoria / Operações', email: 'diretoria@tottalsinalizacao.com.br' },
  { label: 'Engenharia & Projetos', email: 'engenharia@tottalsinalizacao.com.br' },
  { label: 'Manutenção / Mecânica', email: 'manutencao@tottalsinalizacao.com.br' },
];

export const SendEmailModal: React.FC = () => {
  const {
    isConnected,
    googleUser,
    gmailProfile,
    isSending,
    connectGoogle,
    sendEmailWithConfirmation,
    saveDraftEmail,
    closeSendModal,
    modalState,
  } = useGmail();

  const [toInput, setToInput] = useState('');
  const [ccInput, setCcInput] = useState('');
  const [subjectInput, setSubjectInput] = useState('');
  const [customNotes, setCustomNotes] = useState('');
  const [activeTab, setActiveTab] = useState<'PREVIEW' | 'COMPOSE'>('PREVIEW');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [actionType, setActionType] = useState<'SEND' | 'DRAFT'>('SEND');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (modalState.isOpen && modalState.defaultParams) {
      const toVal = Array.isArray(modalState.defaultParams.to)
        ? modalState.defaultParams.to.join(', ')
        : modalState.defaultParams.to || 'obras.tottal@gmail.com';
      const ccVal = Array.isArray(modalState.defaultParams.cc)
        ? modalState.defaultParams.cc.join(', ')
        : modalState.defaultParams.cc || '';
      setToInput(toVal);
      setCcInput(ccVal);
      setSubjectInput(modalState.defaultParams.subject || '');
      setCustomNotes('');
      setFeedback(null);
      setShowConfirmDialog(false);
      setActiveTab('PREVIEW');
    }
  }, [modalState.isOpen, modalState.defaultParams]);

  if (!modalState.isOpen) return null;

  const handleAddQuickRecipient = (email: string) => {
    if (!toInput) {
      setToInput(email);
    } else if (!toInput.includes(email)) {
      setToInput(`${toInput}, ${email}`);
    }
  };

  const getFullBodyHtml = () => {
    const baseHtml = modalState.defaultParams?.bodyHtml || '<p>Sem conteúdo.</p>';
    if (!customNotes.trim()) return baseHtml;

    // Inject note at top of email
    const noteHtml = `
      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-left: 4px solid #16a34a; padding: 12px 16px; margin: 16px 0; border-radius: 6px; font-family: sans-serif;">
        <span style="font-size: 11px; font-weight: 800; color: #166534; text-transform: uppercase; letter-spacing: 0.5px;">Mensagem Adicional do Remetente:</span>
        <p style="margin: 4px 0 0 0; font-size: 13px; color: #14532d; white-space: pre-wrap;">${customNotes}</p>
      </div>
    `;

    return baseHtml.replace('<div style="padding: 24px;">', `<div style="padding: 24px;">${noteHtml}`);
  };

  const handleTriggerAction = (type: 'SEND' | 'DRAFT') => {
    if (!toInput.trim()) {
      setFeedback({ type: 'error', message: 'Por favor, informe ao menos um endereço de e-mail de destino.' });
      return;
    }
    if (!subjectInput.trim()) {
      setFeedback({ type: 'error', message: 'Por favor, informe o assunto do e-mail.' });
      return;
    }
    setActionType(type);
    setShowConfirmDialog(true);
  };

  const handleConfirmExecute = async () => {
    setShowConfirmDialog(false);
    setFeedback(null);

    const toList = toInput
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean);
    const ccList = ccInput
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean);

    try {
      if (actionType === 'SEND') {
        await sendEmailWithConfirmation({
          to: toList,
          cc: ccList.length > 0 ? ccList : undefined,
          subject: subjectInput,
          bodyHtml: getFullBodyHtml(),
        });
        setFeedback({
          type: 'success',
          message: `E-mail enviado com sucesso pelo Gmail para: ${toList.join(', ')}`,
        });
        setTimeout(() => {
          closeSendModal();
        }, 2200);
      } else {
        await saveDraftEmail({
          to: toList,
          cc: ccList.length > 0 ? ccList : undefined,
          subject: subjectInput,
          bodyHtml: getFullBodyHtml(),
        });
        setFeedback({
          type: 'success',
          message: 'Rascunho salvo com sucesso na sua caixa do Gmail!',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Erro ao processar envio pelo Gmail. Verifique sua conexão.',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        
        {/* Modal Top Header */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-red-600 text-white tracking-wide">
                  Gmail Workspace
                </span>
                {isConnected && (
                  <span className="text-[11px] text-emerald-400 flex items-center font-medium">
                    <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                    Conectado ({gmailProfile?.emailAddress || googleUser?.email})
                  </span>
                )}
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white mt-0.5">
                {modalState.type === 'RDO'
                  ? 'Transmitir Relatório da Obra por Gmail'
                  : modalState.type === 'OCCURRENCE'
                  ? 'Enviar Alerta de Ocorrência por Gmail'
                  : 'Enviar E-mail via Google Gmail'}
              </h2>
            </div>
          </div>

          <button
            onClick={closeSendModal}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          
          {/* Feedback alerts */}
          {feedback && (
            <div
              className={`p-3.5 rounded-xl border flex items-start space-x-2.5 text-xs font-semibold ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-red-50 border-red-200 text-red-900'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              )}
              <span className="flex-1">{feedback.message}</span>
            </div>
          )}

          {/* NOT CONNECTED STATE */}
          {!isConnected ? (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto">
                <Mail className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Conecte sua conta Google para enviar e-mails
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  Envie relatórios de obras, notificações de manutenção e alertas diretamente pelo seu Gmail oficial com autorização segura.
                </p>
              </div>

              {/* Official Google Material Sign-In Button style */}
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={() => connectGoogle()}
                  className="gsi-material-button inline-flex items-center justify-center gap-3 px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs border border-slate-300 rounded-lg shadow-xs hover:shadow-sm transition-all cursor-pointer"
                  id="btn-google-signin-modal"
                >
                  <svg className="w-4 h-4" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    <path fill="none" d="M0 0h48v48H0z"></path>
                  </svg>
                  <span>Conectar com Google / Gmail</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Recipient and subject form */}
              <div className="space-y-3 bg-slate-50/80 p-3.5 sm:p-4 rounded-xl border border-slate-200">
                {/* Quick recipient chips */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1.5 flex items-center">
                    <Users className="w-3.5 h-3.5 mr-1 text-blue-600" />
                    Destinatários Rápidos (Clique para adicionar):
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_RECIPIENTS.map((rec) => (
                      <button
                        key={rec.email}
                        type="button"
                        onClick={() => handleAddQuickRecipient(rec.email)}
                        className="px-2.5 py-1 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-md text-[11px] font-medium text-slate-700 hover:text-blue-700 transition-colors flex items-center space-x-1"
                      >
                        <span>+</span>
                        <span>{rec.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* To Field */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Para (E-mails separados por vírgula): <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={toInput}
                    onChange={(e) => setToInput(e.target.value)}
                    placeholder="ex: obras.tottal@gmail.com, cliente@empresa.com"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>

                {/* CC Field */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Com Cópia (CC - Opcional):
                  </label>
                  <input
                    type="text"
                    value={ccInput}
                    onChange={(e) => setCcInput(e.target.value)}
                    placeholder="ex: fiscalizacao@orgao.gov.br"
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>

                {/* Subject Field */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Assunto do E-mail: <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={subjectInput}
                    onChange={(e) => setSubjectInput(e.target.value)}
                    placeholder="Assunto do e-mail"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Optional note */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Mensagem de Acompanhamento (Opcional - inserida no início do e-mail):
                  </label>
                  <textarea
                    rows={2}
                    value={customNotes}
                    onChange={(e) => setCustomNotes(e.target.value)}
                    placeholder="ex: Segue em anexo o relatório referente às atividades do dia de hoje para conferência e validação."
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Preview / HTML View Tabs */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-100 px-3 py-2 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('PREVIEW')}
                      className={`px-3 py-1 rounded-md text-xs font-bold transition-colors flex items-center space-x-1.5 ${
                        activeTab === 'PREVIEW'
                          ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Prévia Visual do E-mail</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('COMPOSE')}
                      className={`px-3 py-1 rounded-md text-xs font-bold transition-colors flex items-center space-x-1.5 ${
                        activeTab === 'COMPOSE'
                          ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Detalhes da Mensagem</span>
                    </button>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Formato HTML Responsivo
                  </span>
                </div>

                {activeTab === 'PREVIEW' ? (
                  <div className="p-4 bg-slate-50 max-h-72 overflow-y-auto">
                    <div
                      className="bg-white rounded-lg p-2 shadow-xs border border-slate-200"
                      dangerouslySetInnerHTML={{ __html: getFullBodyHtml() }}
                    />
                  </div>
                ) : (
                  <div className="p-4 bg-white text-xs text-slate-700 space-y-2 max-h-72 overflow-y-auto">
                    <p>
                      <strong>Remetente Google:</strong> {gmailProfile?.emailAddress || googleUser?.email}
                    </p>
                    <p>
                      <strong>Destinatários:</strong> {toInput || '(Nenhum)'}
                    </p>
                    <p>
                      <strong>Assunto:</strong> {subjectInput}
                    </p>
                    <p className="text-slate-500 text-[11px]">
                      O corpo do e-mail inclui dados tabelados, efetivo em campo, serviços executados com metragens e apontamento de ocorrências formatados no padrão de engenharia.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

        </div>

        {/* Modal Actions Footer */}
        <div className="bg-slate-100 p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500 flex items-center">
            {isConnected ? (
              <span>Envio com segurança autenticado pelo Gmail API</span>
            ) : (
              <span>Necessário conectar conta Google para enviar</span>
            )}
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={closeSendModal}
              disabled={isSending}
              className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg transition-colors"
            >
              Cancelar
            </button>

            {isConnected && (
              <>
                <button
                  type="button"
                  onClick={() => handleTriggerAction('DRAFT')}
                  disabled={isSending}
                  className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-lg transition-colors flex items-center space-x-1.5"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Salvar Rascunho</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTriggerAction('SEND')}
                  disabled={isSending}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center space-x-2 shadow-xs"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Transmitindo...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Enviar E-mail via Gmail</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>

      </div>

      {/* Confirmation Dialog (Mandatory Workspace Skill Requirement) */}
      {showConfirmDialog && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <div className="flex items-center space-x-3 text-blue-600">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {actionType === 'SEND' ? 'Confirmar Envio de E-mail?' : 'Salvar Rascunho no Gmail?'}
                </h3>
                <p className="text-xs text-slate-500">
                  Esta ação transmitirá a mensagem através da sua conta Google oficial.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1.5">
              <div>
                <span className="text-slate-500 font-semibold">Destinatário(s):</span>
                <span className="ml-1 text-slate-900 font-bold">{toInput}</span>
              </div>
              {ccInput && (
                <div>
                  <span className="text-slate-500 font-semibold">Cópia (CC):</span>
                  <span className="ml-1 text-slate-900">{ccInput}</span>
                </div>
              )}
              <div>
                <span className="text-slate-500 font-semibold">Assunto:</span>
                <span className="ml-1 text-slate-900 font-bold">{subjectInput}</span>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmDialog(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors"
              >
                Voltar e Revisar
              </button>
              <button
                type="button"
                onClick={handleConfirmExecute}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center space-x-1.5 shadow-xs"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Sim, Confirmar e Enviar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
