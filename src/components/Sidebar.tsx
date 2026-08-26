import React, { useState } from 'react';
import {
  BarChart3,
  Calendar,
  Building2,
  Users,
  FileText,
  ShieldCheck,
  AlertTriangle,
  History,
  HardHat,
  Plus,
  Wifi,
  WifiOff,
  RefreshCw,
  RotateCcw,
  CheckCircle2,
  ChevronDown,
  CalendarRange,
  Truck,
  Mail,
  Compass,
  MapPin,
  Camera,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';

interface SidebarProps {
  activeTab: string;
  onNavigate: (tab: string) => void;
  onOpenNewRDO: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  highlight?: boolean;
  badge?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onNavigate,
  onOpenNewRDO,
  mobileOpen,
  onCloseMobile,
}) => {
  const { currentUser, allUsers, loginAs, isAdmin, isLeader } = useAuth();
  const { occurrences = [], isOnline, offlineQueue = [], syncOffline, resetAllDataToDemo } = useData();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const pendingOccurrencesCount = (occurrences || []).filter((o) => o && o.status === 'PENDENTE').length;

  const handleSync = async () => {
    setIsSyncing(true);
    await syncOffline();
    setIsSyncing(false);
  };

  const handleResetDemo = async () => {
    if (window.confirm('Deseja restaurar os dados de demonstração iniciais? Suas alterações serão redefinidas.')) {
      await resetAllDataToDemo();
      alert('Dados restaurados com sucesso!');
    }
  };

  const adminNavItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'service-photos', label: 'Fotos dos Serviços', icon: Camera, highlight: true },
    { id: 'team-routes', label: 'Rotas das Equipes', icon: Compass, highlight: true },
    { id: 'appointments', label: 'Agendamentos', icon: CalendarRange, highlight: true },
    { id: 'daily-overview', label: 'Atividades do Dia', icon: Calendar },
    { id: 'worksites', label: 'Gestão de Obras', icon: Building2 },
    { id: 'teams', label: 'Equipes e Ajudantes', icon: Users },
    { id: 'users-permissions', label: 'Usuários & Permissões', icon: ShieldCheck, highlight: true },
    {
      id: 'occurrences',
      label: 'Ocorrências & Alertas',
      icon: AlertTriangle,
      badge: pendingOccurrencesCount > 0 ? pendingOccurrencesCount : undefined,
    },
    { id: 'history', label: 'Histórico de Obras', icon: History },
    { id: 'gmail', label: 'Central Gmail', icon: Mail },
    { id: 'reports', label: 'Relatórios Avançados', icon: FileText },
    { id: 'audit', label: 'Auditoria & Trilha', icon: ShieldCheck },
  ];

  const leaderNavItems: NavItem[] = [
    { id: 'dashboard', label: 'Painel do Chefe', icon: BarChart3 },
    { id: 'team-routes', label: 'Meu Trajeto GPS', icon: Compass, highlight: true },
    { id: 'my-schedule', label: 'Minha Programação', icon: CalendarRange, highlight: true },
    { id: 'new-rdo', label: 'Registrar Obra de Hoje', icon: HardHat },
    { id: 'my-logs', label: 'Minhas Obras Anteriores', icon: History },
    { id: 'gmail', label: 'Enviar via Gmail', icon: Mail },
    { id: 'teams', label: 'Minha Equipe & Ajudantes', icon: Users },
  ];

  const navItems: NavItem[] = isAdmin ? adminNavItems : leaderNavItems;

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-950/70 z-40 lg:hidden backdrop-blur-xs"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`w-64 bg-slate-900 text-white flex flex-col shrink-0 border-r border-slate-800 z-50 transition-transform duration-200 ease-in-out ${
          mobileOpen
            ? 'fixed inset-y-0 left-0 translate-x-0'
            : 'hidden lg:flex'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => {
              onNavigate(isAdmin ? 'dashboard' : 'dashboard');
              if (onCloseMobile) onCloseMobile();
            }}
          >
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-lg shadow-sm text-white">
              G
            </div>
            <div>
              <span className="font-bold text-base tracking-tight uppercase block leading-tight text-white">
                GestorCampo
              </span>
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block">
                Obras & Equipes
              </span>
            </div>
          </div>

          {/* Offline indicator in sidebar */}
          <div className="flex items-center">
            {isOnline ? (
              <span className="w-2 h-2 rounded-full bg-emerald-400" title="Online" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" title="Offline" />
            )}
          </div>
        </div>

        {/* Quick Action Button in Sidebar */}
        <div className="px-4 pt-4 pb-2">
          <button
            onClick={() => {
              onOpenNewRDO();
              if (onCloseMobile) onCloseMobile();
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Obra</span>
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const isHighlight = (item as any).highlight;

            return (
              <div
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  if (onCloseMobile) onCloseMobile();
                }}
                className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors text-sm font-medium ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : isHighlight
                    ? 'bg-blue-950/40 text-blue-300 hover:bg-slate-800 border border-blue-800/40'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className="px-1.5 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded-full animate-pulse">
                    {item.badge}
                  </span>
                )}
              </div>
            );
          })}
        </nav>

        {/* Offline Queue Notice */}
        {(offlineQueue?.length || 0) > 0 && (
          <div className="px-4 py-2 bg-amber-500/10 border-t border-b border-amber-500/20 text-amber-300 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold">{(offlineQueue?.length || 0)} pendente(s) offline</span>
              <button
                onClick={handleSync}
                disabled={!isOnline || isSyncing}
                className="text-[10px] bg-amber-500 text-slate-950 px-2 py-0.5 rounded font-bold hover:bg-amber-400"
              >
                {isSyncing ? 'Sincronizando...' : 'Enviar'}
              </button>
            </div>
          </div>
        )}

        {/* User Profile & Switcher at Bottom */}
        <div className="p-4 border-t border-slate-800 relative">
          <div
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-800 cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-600/30 border border-blue-500/50 flex items-center justify-center text-xs font-bold text-blue-300 uppercase">
                {currentUser.name
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white leading-tight truncate max-w-[110px]">
                  {currentUser.name}
                </span>
                <span className="text-[10px] text-slate-400">
                  {currentUser.role === 'ADMIN'
                    ? 'Administrador (Total)'
                    : currentUser.role === 'GESTOR'
                    ? 'Gestor (Total)'
                    : 'Chefe de Equipe'}
                </span>
              </div>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${userDropdownOpen ? 'rotate-180' : ''}`} />
          </div>

          {/* User Switcher Popup */}
          {userDropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setUserDropdownOpen(false)} />
              <div className="absolute bottom-16 left-3 right-3 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 p-2 text-slate-200">
                <div className="px-2.5 py-1.5 border-b border-slate-700/80 mb-1 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Alternar Perfil</span>
                  <button
                    onClick={handleResetDemo}
                    className="text-[10px] text-blue-400 hover:underline flex items-center gap-1"
                    title="Restaurar dados demo"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    <span>Reset</span>
                  </button>
                </div>

                <div className="space-y-1 max-h-60 overflow-y-auto">
                  <p className="text-[9px] font-bold text-purple-400 uppercase px-2 pt-1">Administradores (Total)</p>
                  {allUsers
                    .filter((u) => u.role === 'ADMIN')
                    .map((user) => (
                      <button
                        key={user.id}
                        onClick={() => {
                          loginAs(user.id);
                          setUserDropdownOpen(false);
                          onNavigate('dashboard');
                        }}
                        className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left text-xs transition ${
                          currentUser.id === user.id ? 'bg-purple-600 text-white font-bold' : 'hover:bg-slate-700 text-slate-300'
                        }`}
                      >
                        <span className="truncate">{user.name}</span>
                        {currentUser.id === user.id && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                      </button>
                    ))}

                  <p className="text-[9px] font-bold text-blue-400 uppercase px-2 pt-2">Gestores (Total)</p>
                  {allUsers
                    .filter((u) => u.role === 'GESTOR')
                    .map((user) => (
                      <button
                        key={user.id}
                        onClick={() => {
                          loginAs(user.id);
                          setUserDropdownOpen(false);
                          onNavigate('dashboard');
                        }}
                        className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left text-xs transition ${
                          currentUser.id === user.id ? 'bg-blue-600 text-white font-bold' : 'hover:bg-slate-700 text-slate-300'
                        }`}
                      >
                        <span className="truncate">{user.name}</span>
                        {currentUser.id === user.id && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                      </button>
                    ))}

                  <p className="text-[9px] font-bold text-amber-400 uppercase px-2 pt-2">Chefes de Campo</p>
                  {allUsers
                    .filter((u) => u.role === 'CHEFE_EQUIPE')
                    .map((user) => (
                      <button
                        key={user.id}
                        onClick={() => {
                          loginAs(user.id);
                          setUserDropdownOpen(false);
                          onNavigate('dashboard');
                        }}
                        className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left text-xs transition ${
                          currentUser.id === user.id ? 'bg-amber-600 text-white font-bold' : 'hover:bg-slate-700 text-slate-300'
                        }`}
                      >
                        <span className="truncate">{user.name}</span>
                        {currentUser.id === user.id && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                      </button>
                    ))}
                </div>
              </div>
            </>
          )}
        </div>
      </aside>
    </>
  );
};
