import React, { useState } from 'react';
import {
  HardHat,
  Users,
  Building2,
  Calendar,
  AlertTriangle,
  BarChart3,
  History,
  FileText,
  Wifi,
  WifiOff,
  RefreshCw,
  UserCheck,
  ShieldCheck,
  RotateCcw,
  CheckCircle2,
  Menu,
  X,
  Clock,
  MapPin,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenNewRDO?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, onOpenNewRDO }) => {
  const { currentUser, allUsers, loginAs, isAdmin, isChefe } = useAuth();
  const { isOnline, pendingOfflineCount, triggerOfflineSync, occurrences, resetAllDataToDemo } = useData();
  const [isSyncing, setIsSyncing] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const pendingOccurrencesCount = occurrences.filter((o) => o.status === 'PENDENTE').length;

  const handleSync = async () => {
    setIsSyncing(true);
    await triggerOfflineSync();
    setIsSyncing(false);
  };

  const handleResetDemo = async () => {
    if (window.confirm('Deseja restaurar os dados de demonstração iniciais? Suas alterações serão redefinidas.')) {
      await resetAllDataToDemo();
      alert('Dados restaurados com sucesso!');
    }
  };

  const adminNavItems = [
    { id: 'dashboard', label: 'Painel Geral', icon: BarChart3 },
    { id: 'daily-overview', label: 'Atividades do Dia', icon: Calendar },
    {
      id: 'occurrences',
      label: 'Ocorrências & Alertas',
      icon: AlertTriangle,
      badge: pendingOccurrencesCount > 0 ? pendingOccurrencesCount : undefined,
    },
    { id: 'history', label: 'Histórico de Obras', icon: History },
    { id: 'teams', label: 'Equipes & Pessoal', icon: Users },
    { id: 'worksites', label: 'Cadastro de Obras', icon: Building2 },
    { id: 'reports', label: 'Relatórios & Gráficos', icon: FileText },
    { id: 'audit', label: 'Auditoria', icon: ShieldCheck },
  ];

  const chefeNavItems = [
    { id: 'chefe-new-rdo', label: 'Novo Registro de Obra', icon: HardHat, highlight: true },
    { id: 'chefe-my-logs', label: 'Meus Registros Anteriores', icon: History },
    { id: 'chefe-my-team', label: 'Minha Equipe & Ajudantes', icon: Users },
  ];

  const navItems = isAdmin ? adminNavItems : chefeNavItems;

  return (
    <header className="bg-slate-900 text-white shadow-md sticky top-0 z-40 border-b border-slate-800" id="main-header">
      {/* Top utility bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo / Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab(isAdmin ? 'dashboard' : 'chefe-new-rdo')}>
            <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center text-slate-950 font-black shadow-inner">
              <HardHat className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight text-white">OBRAS TOTAL</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700">
                  Campo & Gestão
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">Sistema Integrado de Equipes e Gestão de Obras</p>
            </div>
          </div>

          {/* Center / Right controls */}
          <div className="flex items-center space-x-3">
            {/* Network / Offline Sync Status */}
            <div className="flex items-center">
              {isOnline ? (
                <div className="flex items-center text-xs font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2.5 py-1 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse mr-1.5" />
                  <Wifi className="w-3.5 h-3.5 mr-1" />
                  <span className="hidden md:inline">Conectado</span>
                </div>
              ) : (
                <div className="flex items-center text-xs font-medium text-amber-300 bg-amber-950/80 border border-amber-700 px-2.5 py-1 rounded-full animate-pulse">
                  <WifiOff className="w-3.5 h-3.5 mr-1 text-amber-400" />
                  <span>Modo Offline</span>
                </div>
              )}

              {/* Pending Sync Button if any */}
              {pendingOfflineCount > 0 && (
                <button
                  onClick={handleSync}
                  disabled={!isOnline || isSyncing}
                  className={`ml-2 flex items-center text-xs font-semibold px-3 py-1 rounded-full transition shadow-sm ${
                    isOnline
                      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer animate-bounce'
                      : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  }`}
                  title="Registros salvos localmente aguardando envio ao servidor"
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>Sincronizar ({pendingOfflineCount})</span>
                </button>
              )}
            </div>

            {/* Quick Demo Reset (Helpful for evaluation) */}
            <button
              onClick={handleResetDemo}
              title="Restaurar dados iniciais da demonstração"
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition hidden lg:flex items-center text-xs space-x-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Demo</span>
            </button>

            {/* User Profile & Role Switcher */}
            <div className="relative">
              <button
                id="user-profile-button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center space-x-2 p-1.5 pr-2.5 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 transition"
              >
                <img
                  src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                  alt={currentUser.name}
                  className="w-8 h-8 rounded-full object-cover border border-slate-600"
                />
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-semibold text-white leading-tight">{currentUser.name}</div>
                  <div className="text-[10px] text-amber-400 font-medium">
                    {currentUser.role === 'ADMIN'
                      ? '👑 Administrador'
                      : currentUser.role === 'GESTOR'
                      ? '💼 Gestor'
                      : '👷 Chefe de Equipe'}
                  </div>
                </div>
              </button>

              {/* User switcher dropdown */}
              {userDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setUserDropdownOpen(false)} />
                  <div
                    id="user-switcher-dropdown"
                    className="absolute right-0 mt-2 w-72 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 p-2 text-slate-200"
                  >
                    <div className="px-3 py-2 border-b border-slate-700/80 mb-2">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Alternar Usuário / Perfil</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Alterne para testar a visão de Administrador ou Chefe de Campo</p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-amber-400 uppercase px-2 py-0.5">Administradores</p>
                      {allUsers
                        .filter((u) => u.role === 'ADMIN')
                        .map((user) => (
                          <button
                            key={user.id}
                            onClick={() => {
                              loginAs(user.id);
                              setUserDropdownOpen(false);
                              setActiveTab('dashboard');
                            }}
                            className={`w-full flex items-center space-x-2.5 px-2.5 py-2 rounded-lg text-left text-xs transition ${
                              currentUser.id === user.id ? 'bg-amber-500/20 text-amber-300 font-semibold' : 'hover:bg-slate-700 text-slate-300'
                            }`}
                          >
                            <span className="w-2 h-2 rounded-full bg-amber-400" />
                            <div className="flex-1">
                              <p className="text-white font-medium">{user.name}</p>
                              <p className="text-[10px] text-slate-400">{user.email}</p>
                            </div>
                            {currentUser.id === user.id && <CheckCircle2 className="w-4 h-4 text-amber-400" />}
                          </button>
                        ))}

                      <p className="text-[10px] font-bold text-cyan-400 uppercase px-2 py-0.5 mt-2">Chefes de Equipe em Campo</p>
                      {allUsers
                        .filter((u) => u.role === 'CHEFE_EQUIPE')
                        .map((user) => (
                          <button
                            key={user.id}
                            onClick={() => {
                              loginAs(user.id);
                              setUserDropdownOpen(false);
                              setActiveTab('chefe-new-rdo');
                            }}
                            className={`w-full flex items-center space-x-2.5 px-2.5 py-2 rounded-lg text-left text-xs transition ${
                              currentUser.id === user.id ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'hover:bg-slate-700 text-slate-300'
                            }`}
                          >
                            <span className="w-2 h-2 rounded-full bg-cyan-400" />
                            <div className="flex-1">
                              <p className="text-white font-medium">{user.name}</p>
                              <p className="text-[10px] text-slate-400">{user.phone || 'Campo'}</p>
                            </div>
                            {currentUser.id === user.id && <CheckCircle2 className="w-4 h-4 text-cyan-400" />}
                          </button>
                        ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              id="mobile-menu-toggle"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Navigation Tabs */}
      <div className="hidden md:block bg-slate-950 border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-1 py-1.5 overflow-x-auto scrollbar-none" aria-label="Tabs">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              const isHighlight = (item as any).highlight;

              return (
                <button
                  key={item.id}
                  id={`nav-tab-${item.id}`}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-2 px-3 py-2 text-xs font-semibold rounded-lg transition whitespace-nowrap relative ${
                    isActive
                      ? isHighlight
                        ? 'bg-amber-500 text-slate-950 shadow'
                        : 'bg-slate-800 text-white shadow-sm border border-slate-700'
                      : isHighlight
                      ? 'bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 border border-amber-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive && isHighlight ? 'text-slate-950' : ''}`} />
                  <span>{item.label}</span>
                  {item.badge !== undefined && (
                    <span className="ml-1.5 px-1.5 py-0.2 bg-red-500 text-white text-[10px] font-bold rounded-full animate-pulse">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-950 border-t border-slate-800 px-4 pt-2 pb-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const isHighlight = (item as any).highlight;

            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-semibold rounded-lg transition ${
                  isActive
                    ? isHighlight
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'bg-slate-800 text-white'
                    : isHighlight
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
