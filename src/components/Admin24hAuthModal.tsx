import React, { useState } from 'react';
import {
  ShieldCheck,
  KeyRound,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  X,
  UserCheck,
  Calendar,
  Lock,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { User } from '../types';

interface Admin24hAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser?: User | null; // optional target user if an Admin/Gestor is granting to someone else
  onSuccess?: (msg: string) => void;
}

export const Admin24hAuthModal: React.FC<Admin24hAuthModalProps> = ({
  isOpen,
  onClose,
  targetUser,
  onSuccess,
}) => {
  const {
    currentUser,
    allUsers,
    adminAuthSession,
    isTemporarilyAuthorized,
    adminAuthRemainingFormatted,
    adminAuthRemainingMs,
    requestAdminAuth,
    revokeAdminAuth,
    isAdmin,
  } = useAuth();

  // Authors (Administrador and Gestores)
  const authorizers = allUsers.filter(
    (u) => (u.role === 'ADMIN' || u.role === 'GESTOR') && u.active
  );

  const [selectedAuthorizerId, setSelectedAuthorizerId] = useState<string>(
    authorizers[0]?.id || ''
  );
  const [passwordOrPin, setPasswordOrPin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [reason, setReason] = useState('Liberação operacional de campo e ajustes administrativos');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const subjectUser = targetUser || currentUser;
  const isTargetCurrent = subjectUser.id === currentUser.id;
  const activeSessionForSubject =
    isTargetCurrent && isTemporarilyAuthorized ? adminAuthSession : null;

  const handleGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedAuthorizerId) {
      setErrorMsg('Selecione o Administrador ou Gestor autorizador.');
      return;
    }

    if (!passwordOrPin.trim()) {
      setErrorMsg('Digite a senha ou código de segurança do autorizador.');
      return;
    }

    setLoading(true);
    try {
      const res = await requestAdminAuth(
        selectedAuthorizerId,
        passwordOrPin.trim(),
        reason.trim(),
        subjectUser.id
      );

      setPasswordOrPin('');
      if (onSuccess) {
        onSuccess(
          `Autorização administrativa de 24 horas concedida com sucesso para ${subjectUser.name}!`
        );
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao validar credenciais do autorizador.');
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async () => {
    setLoading(true);
    try {
      await revokeAdminAuth('Encerrado manualmente pelo usuário');
      if (onSuccess) {
        onSuccess('Autorização administrativa de 24 horas encerrada com sucesso.');
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao encerrar autorização.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 to-amber-700 p-5 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-white/15 rounded-xl backdrop-blur-xs">
              <ShieldCheck className="w-6 h-6 text-amber-200" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">
                Autorização Administrativa (24 Horas)
              </h3>
              <p className="text-xs text-amber-100 mt-0.5">
                {subjectUser.name} ({subjectUser.role === 'ADMIN' ? 'Administrador' : subjectUser.role === 'GESTOR' ? 'Gestor' : 'Chefe de Equipe'})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {errorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-2.5 text-xs text-red-800 animate-shake">
              <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMsg}</div>
            </div>
          )}

          {/* Active Session Info (if already active) */}
          {activeSessionForSubject && activeSessionForSubject.active ? (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="flex items-center space-x-1.5 text-xs font-bold text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>AUTORIZAÇÃO ATIVA E VÁLIDA</span>
                  </span>
                  <span className="px-2 py-0.5 bg-emerald-200 text-emerald-900 rounded-full text-[11px] font-mono font-bold animate-pulse">
                    {adminAuthRemainingFormatted}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-emerald-950 pt-2 border-t border-emerald-200/60">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-emerald-700 block">Autorizado Por:</span>
                    <span className="font-semibold">{activeSessionForSubject.authorizedByName}</span> ({activeSessionForSubject.authorizedByRole})
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-emerald-700 block">Expira em:</span>
                    <span className="font-semibold">{new Date(activeSessionForSubject.expiresAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span> ({new Date(activeSessionForSubject.expiresAt).toLocaleDateString('pt-BR')})
                  </div>
                </div>

                {activeSessionForSubject.reason && (
                  <div className="mt-2 text-xs text-emerald-900 bg-white/60 p-2 rounded-lg border border-emerald-100">
                    <span className="font-semibold text-emerald-800">Justificativa:</span> {activeSessionForSubject.reason}
                  </div>
                )}
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-1.5">
                <p className="font-semibold text-slate-800 flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Permanência Segura de 24 Horas</span>
                </p>
                <p>
                  • A sessão continuará válida mesmo após fechar o navegador ou reiniciar o computador.
                </p>
                <p>
                  • O acesso será invalidado automaticamente após as 24h ou se o usuário fizer logout/troca de perfil.
                </p>
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={handleRevoke}
                  disabled={loading}
                  className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center space-x-2"
                >
                  <XCircle className="w-4 h-4" />
                  <span>{loading ? 'Encerrando...' : 'Encerrar Autorização Agora'}</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
                >
                  Fechar
                </button>
              </div>
            </div>
          ) : (
            /* Form to Request / Grant 24h Session */
            <form onSubmit={handleGrant} className="space-y-4">
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed">
                <div className="flex items-center space-x-1.5 font-bold text-amber-950 mb-1">
                  <Zap className="w-3.5 h-3.5 text-amber-600" />
                  <span>Acesso Temporário Total por 24 Horas</span>
                </div>
                Esta autorização eleva temporariamente as permissões para nível de <strong>Administrador/Gestor</strong> durante <strong>24 horas consecutivas</strong>. É validada no servidor e permanece ativa após fechar o navegador ou reiniciar a máquina.
              </div>

              {/* Authorizer Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Administrador ou Gestor Autorizador <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedAuthorizerId}
                  onChange={(e) => setSelectedAuthorizerId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 bg-white"
                  required
                >
                  {authorizers.map((auth) => (
                    <option key={auth.id} value={auth.id}>
                      {auth.name} — {auth.role === 'ADMIN' ? 'Administrador' : 'Gestor'} ({auth.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Password / Security Code */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Senha ou Código de Segurança do Autorizador <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={passwordOrPin}
                    onChange={(e) => setPasswordOrPin(e.target.value)}
                    placeholder="Digite a senha do Administrador/Gestor"
                    className="w-full pl-9 pr-10 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  A senha é validada no backend e <strong>nunca</strong> é armazenada no navegador.
                </p>
              </div>

              {/* Justification / Reason */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Motivo / Justificativa Operacional (Opcional)
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ex: Liberação de emergência em campo, edição retroativa de RDO"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Footer Actions */}
              <div className="flex items-center space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-md flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Validando...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Conceder Acesso 24h</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
