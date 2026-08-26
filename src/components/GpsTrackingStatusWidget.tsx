import React from 'react';
import {
  Radio,
  Clock,
  AlertTriangle,
  Compass,
  CheckCircle2,
  XCircle,
  BatteryCharging,
  WifiOff,
  RefreshCw,
  Info,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useGpsTracking } from '../context/GpsTrackingContext';
import { useAuth } from '../context/AuthContext';

interface GpsTrackingStatusWidgetProps {
  compact?: boolean;
}

export const GpsTrackingStatusWidget: React.FC<GpsTrackingStatusWidgetProps> = ({ compact = false }) => {
  const { isLeader, isAdmin, currentUser } = useAuth();
  const {
    trackingStatus,
    isTrackingActive,
    permissionGranted,
    lastRecordedTime,
    interruptedReason,
    accuracy,
    speed,
    batteryLevel,
    offlinePointsCount,
    totalSessionPointsSent,
    requestTrackingPermission,
    startTracking,
    syncOfflineQueueNow,
    openPermissionModal,
    openMobileArchitectureModal,
  } = useGpsTracking();

  // If not a field leader, show neutral or administrative status
  if (!isLeader) {
    return null;
  }

  if (compact) {
    return (
      <div className="flex items-center space-x-2 text-xs">
        {isTrackingActive ? (
          <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-full font-medium shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
            <span className="font-bold">Rastreamento: ATIVO</span>
            {lastRecordedTime && (
              <span className="text-[11px] font-mono text-emerald-800">({lastRecordedTime})</span>
            )}
          </div>
        ) : (
          <button
            onClick={permissionGranted ? startTracking : openPermissionModal}
            className="flex items-center space-x-1.5 px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-300 rounded-full font-medium hover:bg-amber-100 transition shadow-2xs"
            title={interruptedReason || 'Clique para ativar o rastreamento'}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span className="font-bold">Rastreamento Interrompido</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      id="gps-tracking-status-banner"
      className={`rounded-2xl border p-3.5 sm:p-4 transition-all ${
        isTrackingActive
          ? 'bg-gradient-to-r from-emerald-500/10 via-emerald-50/50 to-teal-50/40 border-emerald-300 shadow-xs'
          : 'bg-gradient-to-r from-amber-500/10 via-amber-50/50 to-orange-50/40 border-amber-300 shadow-xs'
      }`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left Status Indicator */}
        <div className="flex items-start sm:items-center space-x-3">
          <div
            className={`p-2.5 rounded-xl border shrink-0 ${
              isTrackingActive
                ? 'bg-emerald-500 text-white border-emerald-600 shadow-xs'
                : 'bg-amber-500 text-white border-amber-600 shadow-xs'
            }`}
          >
            {isTrackingActive ? (
              <Radio className="w-5 h-5 animate-pulse" />
            ) : (
              <AlertTriangle className="w-5 h-5 animate-bounce" />
            )}
          </div>

          <div className="space-y-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs sm:text-sm font-extrabold text-slate-900">
                {isTrackingActive ? (
                  <span className="text-emerald-800 flex items-center gap-1.5">
                    <span>Rastreamento de deslocamento:</span>
                    <span className="bg-emerald-600 text-white px-2 py-0.5 rounded-md text-xs uppercase tracking-wider font-bold">
                      ATIVO
                    </span>
                  </span>
                ) : (
                  <span className="text-amber-900 flex items-center gap-1.5">
                    <span>Rastreamento de deslocamento:</span>
                    <span className="bg-amber-600 text-white px-2 py-0.5 rounded-md text-xs uppercase tracking-wider font-bold">
                      INTERROMPIDO
                    </span>
                  </span>
                )}
              </span>

              {lastRecordedTime && (
                <span className="text-xs font-semibold text-slate-700 bg-white/80 px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs">
                  Última localização registrada: <strong className="font-mono text-slate-900">{lastRecordedTime}</strong>
                </span>
              )}
            </div>

            {/* Subtext explanation */}
            <p className="text-xs text-slate-600 leading-snug">
              {isTrackingActive ? (
                <span>
                  Gravando o <strong>trajeto real</strong> contínuo do aparelho (aberto, minimizado ou tela bloqueada).
                </span>
              ) : (
                <span className="text-amber-800 font-medium">
                  {interruptedReason || 'O rastreamento está inativo. Autorize a localização para registrar seus deslocamentos.'}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Right Info Badges & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-200">
          {/* Accuracy & Speed tags */}
          {isTrackingActive && (
            <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-600">
              {accuracy !== null && (
                <span className="bg-white/80 px-2 py-1 rounded-lg border border-slate-200 font-medium" title="Precisão métrica do sensor GPS">
                  Precisão: ±{accuracy}m
                </span>
              )}
              {speed !== null && (
                <span className="bg-white/80 px-2 py-1 rounded-lg border border-slate-200 font-medium">
                  {speed > 0 ? `${speed} km/h` : 'Parado'}
                </span>
              )}
              {batteryLevel !== null && (
                <span className="bg-white/80 px-2 py-1 rounded-lg border border-slate-200 font-medium flex items-center gap-1">
                  <BatteryCharging className="w-3.5 h-3.5 text-slate-500" />
                  {batteryLevel}%
                </span>
              )}
            </div>
          )}

          {/* Offline points alert if any */}
          {offlinePointsCount > 0 && (
            <button
              onClick={syncOfflineQueueNow}
              className="px-2.5 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition"
              title="Pontos armazenados localmente aguardando envio"
            >
              <WifiOff className="w-3.5 h-3.5 text-amber-700" />
              <span>{offlinePointsCount} offline</span>
            </button>
          )}

          {/* Action button if interrupted */}
          {!isTrackingActive && (
            <button
              onClick={permissionGranted ? startTracking : openPermissionModal}
              id="btn-reactivate-gps-tracking"
              className="px-3.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold shadow-xs transition flex items-center space-x-1.5"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>{permissionGranted ? 'Reativar Rastreamento' : 'Autorizar Rastreamento'}</span>
            </button>
          )}

          {/* Architecture Details Modal trigger */}
          <button
            onClick={openMobileArchitectureModal}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-white/60 rounded-lg border border-slate-200 transition"
            title="Ver detalhes de rastreamento em segundo plano e arquitetura mobile"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
