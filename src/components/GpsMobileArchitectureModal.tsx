import React from 'react';
import {
  Smartphone,
  ShieldCheck,
  Cpu,
  Layers,
  CheckCircle2,
  AlertTriangle,
  X,
  Radio,
  FileCode2,
  Lock,
  BatteryCharging,
} from 'lucide-react';
import { useGpsTracking } from '../context/GpsTrackingContext';

export const GpsMobileArchitectureModal: React.FC = () => {
  const { isMobileArchitectureModalOpen, closeMobileArchitectureModal } = useGpsTracking();

  if (!isMobileArchitectureModalOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200"
      id="modal-gps-mobile-architecture"
    >
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Arquitetura de Rastreamento em Segundo Plano</h2>
              <p className="text-xs text-slate-400">Diretrizes de Execução Mobile, Web/PWA e Aplicativo Fechado</p>
            </div>
          </div>
          <button
            onClick={closeMobileArchitectureModal}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-slate-700 text-xs sm:text-sm">
          {/* Core Architectural Principle */}
          <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 text-emerald-950">
            <div className="flex items-start space-x-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-sm text-emerald-900 mb-1">
                  Garantia de Trajeto Real — Sem Simulação Artifical
                </h3>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  O sistema obedece rigorosamente à diretriz de registrar <strong>estritamente coordenadas reais de GPS dos aparelhos</strong>. Em nenhuma circunstância o sistema inventa pontos fictícios, calcula rotas navegacionais teóricas ou substitui o caminho real por previsões.
                </p>
              </div>
            </div>
          </div>

          {/* Behavior Breakdown by Environment */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-blue-600" />
              Comportamento por Ambiente Operacional
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Web / PWA Mode */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center space-x-2 text-slate-900 font-bold text-xs">
                  <Radio className="w-4 h-4 text-blue-600" />
                  <span>Ambiente Web / PWA Atual</span>
                </div>
                <ul className="space-y-1.5 text-[11px] text-slate-600">
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span><strong>App Aberto:</strong> Rastreamento contínuo em tempo real.</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span><strong>App Minimizado:</strong> Mantido via Geolocation Watcher.</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span><strong>Tela Bloqueada:</strong> Mantido via Screen Wake Lock.</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span><strong>Sem Internet:</strong> Fila offline local com auto-sync.</span>
                  </li>
                  <li className="flex items-center gap-1.5 text-amber-700 font-medium">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span><strong>App Forçado a Fechar (Kill):</strong> O navegador encerra a thread (não simula dados).</span>
                  </li>
                </ul>
              </div>

              {/* Native Android / iOS Mode */}
              <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center space-x-2 text-blue-950 font-bold text-xs">
                  <Smartphone className="w-4 h-4 text-blue-700" />
                  <span>Aplicativo Nativo Android / iOS</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Para rastreamento mesmo se o usuário fechar totalmente a tela ou reiniciar o aparelho, a plataforma integra-se com o módulo nativo com permissão de localização contínua:
                </p>
                <ul className="space-y-1.5 text-[11px] text-slate-600">
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span><strong>Android:</strong> <code>ForegroundLocationService</code> com notificação persistente.</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span><strong>iOS:</strong> <code>UIBackgroundModes = location</code>.</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span><strong>Filtro Inteligente:</strong> Economia de bateria por deslocamento (delta &gt; 25m ou speed &gt; 3 km/h).</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Android Native Foreground Service Configuration */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <FileCode2 className="w-4 h-4 text-slate-600" />
              Manifesto Android para Rastreamento Contínuo (APK/AAB)
            </h4>
            <pre className="bg-slate-900 text-slate-200 p-3.5 rounded-xl text-[11px] font-mono overflow-x-auto leading-relaxed border border-slate-800">
{`<!-- AndroidManifest.xml -->
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />
<uses-permission android:name="android.permission.WAKE_LOCK" />

<service
    android:name=".location.ForegroundLocationService"
    android:foregroundServiceType="location"
    android:enabled="true"
    android:exported="false" />`}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={closeMobileArchitectureModal}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
