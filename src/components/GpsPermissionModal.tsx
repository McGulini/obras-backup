import React from 'react';
import { ShieldCheck, Compass, MapPin, AlertCircle, CheckCircle2, Lock, Radio, BatteryCharging } from 'lucide-react';
import { useGpsTracking } from '../context/GpsTrackingContext';
import { useAuth } from '../context/AuthContext';

export const GpsPermissionModal: React.FC = () => {
  const { isPermissionModalOpen, closePermissionModal, requestTrackingPermission } = useGpsTracking();
  const { currentUser } = useAuth();

  if (!isPermissionModalOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200"
      id="modal-gps-permission"
    >
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 text-white p-6 relative">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-xs border border-white/20">
              <Compass className="w-6 h-6 text-blue-200 animate-spin-slow" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Autorização de Localização Real</h2>
              <p className="text-xs text-blue-200">Registro Contínuo de Deslocamento Operacional</p>
            </div>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-4 text-slate-700 text-sm">
          {/* Main Mandatory User-Facing Notice Text */}
          <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-4 text-blue-950 font-medium leading-relaxed">
            <div className="flex items-start space-x-2.5">
              <Radio className="w-5 h-5 text-blue-700 shrink-0 mt-0.5 animate-pulse" />
              <p className="text-[13px] sm:text-sm font-semibold">
                &ldquo;Para registrar seus deslocamentos de trabalho, o aplicativo precisa utilizar sua localização mesmo quando estiver em segundo plano.&rdquo;
              </p>
            </div>
          </div>

          <div className="space-y-2.5 text-xs text-slate-600">
            <div className="flex items-start space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>Registro do Trajeto Real:</strong> Grava apenas onde o aparelho realmente esteve (sem rotas sugeridas ou estimadas).
              </span>
            </div>

            <div className="flex items-start space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>Segundo Plano & Tela Bloqueada:</strong> O monitoramento continua ativo com o aplicativo minimizado ou a tela desligada durante a jornada.
              </span>
            </div>

            <div className="flex items-start space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>Identificação Automática de Paradas:</strong> Registra chegadas em obras e períodos de permanência no local de trabalho.
              </span>
            </div>

            <div className="flex items-start space-x-2">
              <BatteryCharging className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Economia Inteligente de Bateria:</strong> Algoritmo com filtro delta que otimiza o consumo de energia quando o aparelho está parado.
              </span>
            </div>

            <div className="flex items-start space-x-2">
              <Lock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              <span>
                <strong>Privacidade e Segurança:</strong> Acesso restrito exclusivamente aos Gestores e Administradores da empresa para fins de diário de obras.
              </span>
            </div>
          </div>

          {currentUser && (
            <div className="text-[11px] text-slate-400 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              Chefe de Equipe: <strong className="text-slate-700">{currentUser.name}</strong> ({currentUser.email})
            </div>
          )}
        </div>

        {/* Actions Footer */}
        <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-200 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={closePermissionModal}
            id="btn-gps-permission-cancel"
            className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition"
          >
            Agora Não
          </button>
          <button
            type="button"
            onClick={async () => {
              await requestTrackingPermission();
            }}
            id="btn-gps-permission-grant"
            className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl shadow-md transition flex items-center justify-center space-x-2"
          >
            <ShieldCheck className="w-4 h-4 text-blue-200" />
            <span>Autorizar Rastreamento</span>
          </button>
        </div>
      </div>
    </div>
  );
};
