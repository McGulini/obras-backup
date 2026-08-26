import React, { useState } from 'react';
import {
  Menu,
  Plus,
  Wifi,
  WifiOff,
  UserCheck,
  Building2,
  Users,
  Calendar,
  AlertTriangle,
  History,
  FileText,
  ShieldCheck,
  BarChart3,
  HardHat,
  ChevronDown,
  ArrowLeft,
  CalendarRange,
  Mail,
  KeyRound,
  Clock,
  Zap,
  XCircle,
  Compass,
  Camera,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useGmail } from '../context/GmailContext';
import { Admin24hAuthModal } from './Admin24hAuthModal';

interface TopHeaderProps {
  activeTab: string;
  onOpenMobileMenu: () => void;
  onOpenNewRDO: () => void;
  onNavigate: (tab: string) => void;
}

interface HeaderTabItem {
  id: string;
  label: string;
  icon: any;
  badge?: number;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  activeTab,
  onOpenMobileMenu,
  onOpenNewRDO,
  onNavigate,
}) => {
  const {
    currentUser,
    allUsers = [],
    loginAs,
    isAdmin,
    isLeader,
    isTemporarilyAuthorized,
    adminAuthSession,
    adminAuthRemainingFormatted,
    revokeAdminAuth,
  } = useAuth();
  const { isOnline, offlineQueue = [], occurrences = [] } = useData();
  const { isConnected, googleUser, gmailProfile } = useGmail();
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const pendingOccurrencesCount = (occurrences || []).filter((o) => o && o.status === 'PENDENTE').length;

  const adminTabs: HeaderTabItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'service-photos', label: 'Fotos dos Serviços', icon: Camera },
    { id: 'team-routes', label: 'Rotas GPS', icon: Compass },
    { id: 'appointments', label: 'Agendamentos', icon: CalendarRange },
    { id: 'daily-overview', label: 'Atividades', icon: Calendar },
    { id: 'worksites', label: 'Obras', icon: Building2 },
    { id: 'teams', label: 'Equipes', icon: Users },
    { id: 'users-permissions', label: 'Usuários & Acessos', icon: ShieldCheck },
    { id: 'occurrences', label: 'Ocorrências', icon: AlertTriangle, badge: pendingOccurrencesCount },
    { id: 'history', label: 'Histórico', icon: History },
    { id: 'gmail', label: 'Gmail', icon: Mail },
    { id: 'reports', label: 'Relatórios', icon: FileText },
  ];

  const leaderTabs: HeaderTabItem[] = [
    { id: 'dashboard', label: 'Painel', icon: BarChart3 },
    { id: 'team-routes', label: 'Meu Trajeto GPS', icon: Compass },
    { id: 'my-schedule', label: 'Minha Programação', icon: CalendarRange },
    { id: 'new-rdo', label: 'Registrar Obra', icon: HardHat },
    { id: 'my-logs', label: 'Minhas Obras', icon: History },
    { id: 'gmail', label: 'Gmail', icon: Mail },
    { id: 'teams', label: 'Minha Equipe', icon: Users },
  ];

  const quickNavTabs = isAdmin ? adminTabs : leaderTabs;

  return (
    <header className="bg-white border-b border-slate-200 shrink-0 sticky top-0 z-30 flex flex-col">
      {/* Persistent 24-Hour Administrative Authorization Banner (if active) */}
      {isTemporarilyAuthorized && adminAuthSession && (
        <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 text-white px-3 sm:px-6 py-1.5 flex items-center justify-between text-[11px] sm:text-xs shadow-inner">
          <div className="flex items-center gap-2 truncate">
            <span className="p-1 bg-white/20 rounded-md shrink-0">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-200" />
            </span>
            <span className="font-bold tracking-wide">
              AUTORIZAÇÃO ADMINISTRATIVA DE 24H ATIVA
            </span>
            <span className="hidden md:inline text-amber-100">
              | Autorizado por: <strong>{adminAuthSession.authorizedByName}</strong> ({adminAuthSession.authorizedByRole})
            </span>
            <span className="bg-black/25 px-2 py-0.5 rounded-full font-mono font-bold text-amber-200 text-[10px] sm:text-[11px]">
              Restam: {adminAuthRemainingFormatted}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setAuthModalOpen(true)}
              className="px-2 py-0.5 bg-white/20 hover:bg-white/30 text-white rounded text-[11px] font-semibold transition"
            >
              Detalhes
            </button>
            <button
              onClick={() => revokeAdminAuth('Encerrado pelo usuário na barra superior')}
              className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded text-[11px] font-bold transition flex items-center gap-1"
              title="Encerrar autorização imediatamente"
            >
              <XCircle className="w-3 h-3" />
              <span>Encerrar</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Top Row */}
      <div className="h-13 sm:h-16 px-2.5 sm:px-6 flex items-center justify-between gap-1.5 sm:gap-4">
        {/* Left: Mobile menu toggle + Brand for mobile + Active Page */}
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          <button
            onClick={onOpenMobileMenu}
            className="lg:hidden p-1.5 sm:p-2 rounded-lg text-slate-700 hover:bg-slate-100 focus:outline-none shrink-0"
            title="Abrir menu lateral"
            id="btn-open-mobile-sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Quick Back Button when not on Dashboard */}
          {activeTab !== 'dashboard' && (
            <button
              onClick={() => onNavigate('dashboard')}
              className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold shrink-0 transition-colors"
              title="Voltar ao Painel Principal"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar</span>
            </button>
          )}

          <div className="flex items-center gap-1.5 truncate">
            <span className="lg:hidden font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded text-[11px] shrink-0">
              GestorCampo
            </span>
            <h1 className="text-xs sm:text-base lg:text-lg font-bold text-slate-800 tracking-tight truncate">
              {activeTab === 'dashboard' && (isAdmin ? 'Dashboard' : 'Painel de Campo')}
              {activeTab === 'appointments' && 'Agendamentos'}
              {activeTab === 'my-schedule' && 'Minha Programação'}
              {activeTab === 'daily-overview' && 'Atividades do Dia'}
              {activeTab === 'worksites' && 'Gestão de Obras'}
              {activeTab === 'teams' && 'Equipes e Ajudantes'}
              {activeTab === 'users-permissions' && 'Usuários e Permissões'}
              {activeTab === 'history' && 'Histórico de Obras'}
              {activeTab === 'occurrences' && 'Central de Ocorrências'}
              {activeTab === 'gmail' && 'Central de E-mails (Gmail)'}
              {activeTab === 'reports' && 'Relatórios'}
              {activeTab === 'audit' && 'Auditoria'}
              {activeTab === 'new-rdo' && 'Registrar Obra'}
              {activeTab === 'my-logs' && 'Minhas Obras'}
            </h1>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* 24-Hour Admin Auth Button */}
          <button
            onClick={() => setAuthModalOpen(true)}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold border transition-colors ${
              isTemporarilyAuthorized
                ? 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200'
                : currentUser?.role === 'CHEFE_EQUIPE'
                ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
            title="Autorização Administrativa de 24 Horas"
            id="btn-admin-auth-24h"
          >
            <ShieldCheck className={`w-3.5 h-3.5 ${isTemporarilyAuthorized ? 'text-amber-600' : 'text-slate-500'}`} />
            <span className="hidden sm:inline">
              {isTemporarilyAuthorized ? '24h Ativo' : 'Autorização 24h'}
            </span>
          </button>

          {/* Gmail Status Button */}
          <button
            onClick={() => onNavigate('gmail')}
            className={`hidden md:inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold border transition-colors ${
              isConnected
                ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
            title={isConnected ? `Gmail Conectado: ${gmailProfile?.emailAddress || googleUser?.email}` : 'Conectar Gmail'}
          >
            <Mail className={`w-3.5 h-3.5 ${isConnected ? 'text-red-600' : 'text-slate-400'}`} />
            <span className="hidden lg:inline">{isConnected ? 'Gmail Conectado' : 'Conectar Gmail'}</span>
            {isConnected && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
          </button>

          {/* Quick Profile / Role Switcher */}
          <div className="relative">
            <button
              onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg border border-slate-200 hover:border-blue-400 bg-slate-50 text-[11px] sm:text-xs font-semibold text-slate-700 transition-colors"
              title="Alternar Perfil de Acesso"
              id="btn-switch-role"
            >
              <UserCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="max-w-[70px] sm:max-w-[120px] truncate">{currentUser?.name?.split(' ')[0] || 'Usuário'}</span>
              <span className={`hidden sm:inline-block px-1.5 py-0.2 rounded text-[10px] uppercase font-bold ${
                currentUser?.role === 'ADMIN'
                  ? 'bg-purple-100 text-purple-800'
                  : currentUser?.role === 'GESTOR'
                  ? 'bg-blue-100 text-blue-800'
                  : isTemporarilyAuthorized
                  ? 'bg-amber-200 text-amber-900 border border-amber-300'
                  : 'bg-amber-100 text-amber-800'
              }`}>
                {currentUser?.role === 'ADMIN'
                  ? 'Admin'
                  : currentUser?.role === 'GESTOR'
                  ? 'Gestor'
                  : isTemporarilyAuthorized
                  ? 'Chefe (24h)'
                  : 'Chefe'}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {roleDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setRoleDropdownOpen(false)} />
                <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 p-2 text-slate-800 animate-fade-in max-h-96 overflow-y-auto">
                  <div className="flex items-center justify-between px-2 py-1 border-b border-slate-100 mb-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Alternar Usuário</span>
                    <button
                      onClick={() => {
                        setRoleDropdownOpen(false);
                        onNavigate('users-permissions');
                      }}
                      className="text-[10px] font-bold text-blue-600 hover:underline"
                    >
                      Gerenciar Acessos →
                    </button>
                  </div>

                  {/* Administradores */}
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold uppercase text-purple-700 px-2 pt-1">Administrador (Acesso Total)</p>
                    {allUsers.filter((u) => u.role === 'ADMIN').map((u) => (
                      <button
                        key={u.id}
                        onClick={() => {
                          loginAs(u.id);
                          setRoleDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-medium transition ${
                          currentUser?.id === u.id
                            ? 'bg-purple-600 text-white font-bold'
                            : 'hover:bg-purple-50 text-slate-700'
                        }`}
                      >
                        <div className="text-left">
                          <p className="leading-tight">{u.name}</p>
                          <p className={`text-[10px] ${currentUser?.id === u.id ? 'text-purple-100' : 'text-slate-400'}`}>
                            {u.email}
                          </p>
                        </div>
                        {currentUser?.id === u.id && <span className="text-[10px]">✓</span>}
                      </button>
                    ))}

                    {/* Gestores */}
                    <p className="text-[9px] font-bold uppercase text-blue-700 px-2 pt-2">Gestores (Acesso Total)</p>
                    {allUsers.filter((u) => u.role === 'GESTOR').map((u) => (
                      <button
                        key={u.id}
                        onClick={() => {
                          loginAs(u.id);
                          setRoleDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-medium transition ${
                          currentUser?.id === u.id
                            ? 'bg-blue-600 text-white font-bold'
                            : 'hover:bg-blue-50 text-slate-700'
                        }`}
                      >
                        <div className="text-left">
                          <p className="leading-tight">{u.name}</p>
                          <p className={`text-[10px] ${currentUser?.id === u.id ? 'text-blue-100' : 'text-slate-400'}`}>
                            {u.email}
                          </p>
                        </div>
                        {currentUser?.id === u.id && <span className="text-[10px]">✓</span>}
                      </button>
                    ))}

                    {/* Chefes de Campo */}
                    <p className="text-[9px] font-bold uppercase text-amber-700 px-2 pt-2">Chefes de Campo (Operacional)</p>
                    {allUsers.filter((u) => u.role === 'CHEFE_EQUIPE').map((u) => (
                      <button
                        key={u.id}
                        onClick={() => {
                          loginAs(u.id);
                          setRoleDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-medium transition ${
                          currentUser?.id === u.id
                            ? 'bg-amber-600 text-white font-bold'
                            : 'hover:bg-amber-50 text-slate-700'
                        }`}
                      >
                        <div className="text-left">
                          <p className="leading-tight">{u.name}</p>
                          <p className={`text-[10px] ${currentUser?.id === u.id ? 'text-amber-100' : 'text-slate-400'}`}>
                            {u.teamId || 'Equipe Campo'}
                          </p>
                        </div>
                        {currentUser?.id === u.id && <span className="text-[10px]">✓</span>}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Online/Offline Status Indicator */}
          <div className="hidden sm:flex items-center">
            {isOnline ? (
              <span className="flex items-center text-[10px] sm:text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1" />
                Online
              </span>
            ) : (
              <span className="flex items-center text-[10px] sm:text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-300 px-2 py-0.5 rounded-full">
                <WifiOff className="w-3 h-3 mr-1 text-amber-600" />
                Offline ({(offlineQueue?.length || 0)})
              </span>
            )}
          </div>

          {/* Primary Action Button: Nova Obra */}
          {activeTab !== 'new-rdo' && (
            <button
              onClick={onOpenNewRDO}
              id="btn-topbar-new-rdo"
              className="bg-blue-600 hover:bg-blue-700 text-white text-[11px] sm:text-xs px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-lg font-bold shadow-xs transition-colors flex items-center gap-1 shrink-0 active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Registrar Obra</span>
            </button>
          )}
        </div>
      </div>

      {/* Horizontal Quick-Access Scrollable Navigation Bar */}
      <div className="flex items-center gap-1 px-2.5 sm:px-6 py-1 bg-slate-100/90 border-t border-slate-200 overflow-x-auto no-scrollbar">
        {quickNavTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onNavigate(tab.id)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{tab.label}</span>
              {tab.badge && tab.badge > 0 ? (
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-red-500 text-white">
                  {tab.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* 24-Hour Auth Modal */}
      <Admin24hAuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />
    </header>
  );
};

