import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Users,
  Shield,
  ShieldCheck,
  UserCheck,
  UserX,
  Plus,
  Search,
  Filter,
  KeyRound,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  HardHat,
  Briefcase,
  Crown,
  Phone,
  Mail,
  Lock,
  Building2,
  Layers,
  ArrowRightLeft,
  Check,
  X,
  AlertTriangle,
  Info,
  Calendar,
  Eye,
  EyeOff,
  Clock,
  Zap,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { User, UserRole, CustomPermissions, AdminAuthSession } from '../types';
import { Admin24hAuthModal } from './Admin24hAuthModal';
import { fetch24hAdminSessions, revoke24hAdminAuth } from '../services/api';

export const UsersAndPermissionsManagement: React.FC = () => {
  const {
    currentUser,
    allUsers,
    addNewUser,
    editUser,
    removeUser,
    toggleStatus,
    changePassword,
    loginAs,
    isAdmin,
    isGestor,
    hasFullAccess,
  } = useAuth();

  const { teams = [], worksites = [] } = useData();

  // Filters & State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<'ALL' | UserRole>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'matrix' | 'auth24h'>('users');

  // 24-Hour Auth Sessions state
  const [sessionsList, setSessionsList] = useState<AdminAuthSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [auth24hModalOpen, setAuth24hModalOpen] = useState(false);
  const [auth24hTargetUser, setAuth24hTargetUser] = useState<User | null>(null);

  // Modals
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordTargetUser, setPasswordTargetUser] = useState<User | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState('');
  const [confirmPasswordValue, setConfirmPasswordValue] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<User | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const data = await fetch24hAdminSessions();
      setSessionsList(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    if (activeSubTab === 'auth24h') {
      loadSessions();
    }
  }, [activeSubTab, loadSessions]);

  const handleRevokeSession = async (session: AdminAuthSession) => {
    try {
      await revoke24hAdminAuth({
        token: session.token,
        revokedByUserId: currentUser.id,
        reason: `Revogado manualmente pelo administrador ${currentUser.name}`,
      });
      showNotification(`Autorização de ${session.userName} encerrada com sucesso.`);
      loadSessions();
    } catch (err: any) {
      alert('Erro ao revogar sessão: ' + (err.message || 'Erro'));
    }
  };

  const handleOpenAuth24hForUser = (user: User) => {
    setAuth24hTargetUser(user);
    setAuth24hModalOpen(true);
  };

  // Form State for User Modal
  const [formData, setFormData] = useState<{
    name: string;
    username: string;
    email: string;
    phone: string;
    role: UserRole;
    password: string;
    active: boolean;
    teamId: string;
    assignedTeamIds: string[];
    assignedWorksiteIds: string[];
  }>({
    name: '',
    username: '',
    email: '',
    phone: '',
    role: 'CHEFE_EQUIPE',
    password: '',
    active: true,
    teamId: '',
    assignedTeamIds: [],
    assignedWorksiteIds: [],
  });

  const showNotification = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  // Open modal to create
  const handleOpenCreateModal = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      username: '',
      email: '',
      phone: '',
      role: 'CHEFE_EQUIPE',
      password: '',
      active: true,
      teamId: teams[0]?.id || '',
      assignedTeamIds: [],
      assignedWorksiteIds: [],
    });
    setUserModalOpen(true);
  };

  // Open modal to edit
  const handleOpenEditModal = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      username: user.username || user.email.split('@')[0] || '',
      email: user.email,
      phone: user.phone || '',
      role: user.role,
      password: '',
      active: user.active,
      teamId: user.teamId || '',
      assignedTeamIds: user.assignedTeamIds || (user.teamId ? [user.teamId] : []),
      assignedWorksiteIds: user.assignedWorksiteIds || [],
    });
    setUserModalOpen(true);
  };

  // Open modal to change password
  const handleOpenPasswordModal = (user: User) => {
    setPasswordTargetUser(user);
    setNewPasswordValue('');
    setConfirmPasswordValue('');
    setShowPassword(false);
    setPasswordModalOpen(true);
  };

  // Save User (Create or Update)
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      alert('Por favor, preencha o nome e o e-mail do usuário.');
      return;
    }

    try {
      if (editingUser) {
        // Update
        const payload: Partial<User> = {
          name: formData.name.trim(),
          username: formData.username.trim() || formData.name.toLowerCase().replace(/\s+/g, '.'),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          role: formData.role,
          active: formData.active,
          teamId: formData.role === 'CHEFE_EQUIPE' ? formData.teamId : undefined,
          assignedTeamIds: formData.assignedTeamIds,
          assignedWorksiteIds: formData.assignedWorksiteIds,
        };
        if (formData.password.trim()) {
          payload.password = formData.password.trim();
        }
        await editUser(editingUser.id, payload);
        showNotification(`Usuário "${formData.name}" atualizado com sucesso!`);
      } else {
        // Create
        const payload: Partial<User> = {
          name: formData.name.trim(),
          username: formData.username.trim() || formData.name.toLowerCase().replace(/\s+/g, '.'),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          role: formData.role,
          active: formData.active,
          password: formData.password.trim() || '123456',
          teamId: formData.role === 'CHEFE_EQUIPE' ? formData.teamId : undefined,
          assignedTeamIds: formData.assignedTeamIds,
          assignedWorksiteIds: formData.assignedWorksiteIds,
        };
        await addNewUser(payload);
        showNotification(`Novo usuário "${formData.name}" cadastrado com sucesso!`);
      }
      setUserModalOpen(false);
    } catch (err: any) {
      alert('Erro ao salvar usuário: ' + (err.message || 'Erro desconhecido'));
    }
  };

  // Submit Password Change
  const handleSubmitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordTargetUser) return;
    if (!newPasswordValue || newPasswordValue.length < 4) {
      alert('A nova senha deve possuir pelo menos 4 caracteres.');
      return;
    }
    if (newPasswordValue !== confirmPasswordValue) {
      alert('As senhas digitadas não coincidem.');
      return;
    }

    try {
      await changePassword(passwordTargetUser.id, newPasswordValue);
      showNotification(`Senha do usuário "${passwordTargetUser.name}" alterada com sucesso!`);
      setPasswordModalOpen(false);
    } catch (err: any) {
      alert('Erro ao alterar senha: ' + (err.message || 'Erro desconhecido'));
    }
  };

  // Toggle Active
  const handleToggleStatus = async (user: User) => {
    try {
      await toggleStatus(user.id);
      const action = user.active ? 'desativado' : 'ativado';
      showNotification(`Usuário "${user.name}" foi ${action} com sucesso.`);
    } catch (err: any) {
      alert('Erro ao alterar status: ' + (err.message || 'Erro'));
    }
  };

  // Quick Role Change
  const handleQuickRoleChange = async (user: User, newRole: UserRole) => {
    if (user.role === newRole) return;
    try {
      await editUser(user.id, { role: newRole });
      const roleName = newRole === 'ADMIN' ? 'Administrador' : newRole === 'GESTOR' ? 'Gestor' : 'Chefe de Equipe';
      showNotification(`Perfil de "${user.name}" alterado para ${roleName}.`);
    } catch (err: any) {
      alert('Erro ao alterar perfil: ' + (err.message || 'Erro'));
    }
  };

  // Delete User Confirm
  const handleConfirmDelete = async () => {
    if (!deleteConfirmUser) return;
    try {
      await removeUser(deleteConfirmUser.id);
      showNotification(`Usuário "${deleteConfirmUser.name}" excluído com sucesso.`);
      setDeleteConfirmUser(null);
    } catch (err: any) {
      alert('Erro ao excluir usuário: ' + (err.message || 'Erro'));
    }
  };

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return (allUsers || []).filter((u) => {
      if (!u) return false;
      const matchSearch =
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.username && u.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.phone && u.phone.includes(searchTerm));

      const matchRole = selectedRoleFilter === 'ALL' || u.role === selectedRoleFilter;
      const matchStatus =
        selectedStatusFilter === 'ALL' ||
        (selectedStatusFilter === 'ACTIVE' && u.active) ||
        (selectedStatusFilter === 'INACTIVE' && !u.active);

      return matchSearch && matchRole && matchStatus;
    });
  }, [allUsers, searchTerm, selectedRoleFilter, selectedStatusFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = allUsers.length;
    const admins = allUsers.filter((u) => u.role === 'ADMIN').length;
    const gestores = allUsers.filter((u) => u.role === 'GESTOR').length;
    const chefes = allUsers.filter((u) => u.role === 'CHEFE_EQUIPE').length;
    const active = allUsers.filter((u) => u.active).length;
    const inactive = total - active;
    return { total, admins, gestores, chefes, active, inactive };
  }, [allUsers]);

  // Permissions Matrix Definition
  const permissionsList = [
    { name: 'Acessar todos os módulos da plataforma', admin: true, gestor: true, chefe: false },
    { name: 'Visualizar todos os dados e relatórios', admin: true, gestor: true, chefe: false },
    { name: 'Criar registros de obras (RDO)', admin: true, gestor: true, chefe: true },
    { name: 'Editar qualquer registro de obra', admin: true, gestor: true, chefe: false },
    { name: 'Excluir registros de obras', admin: true, gestor: true, chefe: false },
    { name: 'Criar novos usuários e acessos', admin: true, gestor: true, chefe: false },
    { name: 'Editar dados, login e perfil de usuários', admin: true, gestor: true, chefe: false },
    { name: 'Excluir usuários da plataforma', admin: true, gestor: true, chefe: false },
    { name: 'Ativar e desativar contas de usuários', admin: true, gestor: true, chefe: false },
    { name: 'Alterar senhas de qualquer usuário', admin: true, gestor: true, chefe: false },
    { name: 'Criar e gerenciar equipes e ajudantes', admin: true, gestor: true, chefe: false },
    { name: 'Vincular e remover usuários de equipes', admin: true, gestor: true, chefe: false },
    { name: 'Cadastrar e gerenciar obras e contratos', admin: true, gestor: true, chefe: false },
    { name: 'Vincular e desvincular equipes a obras', admin: true, gestor: true, chefe: false },
    { name: 'Programar agendamentos e itinerários', admin: true, gestor: true, chefe: false },
    { name: 'Gerenciar central de ocorrências e alertas', admin: true, gestor: true, chefe: false },
    { name: 'Enviar relatórios em PDF via Gmail', admin: true, gestor: true, chefe: true },
    { name: 'Exportar dados para PDF e planilhas', admin: true, gestor: true, chefe: false },
    { name: 'Visualizar logs completos de auditoria', admin: true, gestor: true, chefe: false },
    { name: 'Painel exclusivo "Usuários e Permissões"', admin: true, gestor: true, chefe: false },
  ];

  return (
    <div className="space-y-6 pb-12 animate-fade-in" id="panel-users-permissions">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-2 border border-slate-700 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-medium">{successToast}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
              Controle de Acesso & RBAC
            </span>
            <span className="text-xs text-slate-400">
              Administradores e Gestores com Acesso Total e Irrestrito
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            Usuários e Permissões
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Gerencie o cadastro de usuários, logins, senhas, perfis de acesso, equipes e vínculos operacionais.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0 flex-wrap gap-y-2">
          <button
            onClick={() => setActiveSubTab('users')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors flex items-center space-x-1.5 ${
              activeSubTab === 'users'
                ? 'bg-blue-50 text-blue-700 border-blue-300'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4 text-blue-600" />
            <span>Lista de Usuários</span>
          </button>

          <button
            onClick={() => setActiveSubTab('matrix')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors flex items-center space-x-1.5 ${
              activeSubTab === 'matrix'
                ? 'bg-indigo-50 text-indigo-700 border-indigo-300'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Shield className="w-4 h-4 text-indigo-600" />
            <span>Matriz de Permissões</span>
          </button>

          <button
            onClick={() => setActiveSubTab('auth24h')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors flex items-center space-x-1.5 ${
              activeSubTab === 'auth24h'
                ? 'bg-amber-50 text-amber-800 border-amber-300 ring-2 ring-amber-400'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Zap className="w-4 h-4 text-amber-600" />
            <span>Autorizações 24h</span>
            {sessionsList.filter((s) => s.active && s.expiresAtTimestamp > Date.now()).length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                {sessionsList.filter((s) => s.active && s.expiresAtTimestamp > Date.now()).length}
              </span>
            )}
          </button>

          <button
            onClick={handleOpenCreateModal}
            id="btn-add-user"
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center space-x-1.5 transition-colors active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Usuário</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Total Usuários</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-1">{stats.total}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">{stats.active} ativos no sistema</p>
        </div>

        {/* Administradores */}
        <div className="bg-white p-4 rounded-xl border border-purple-200 shadow-xs bg-purple-50/20">
          <div className="flex items-center justify-between text-purple-700 text-xs font-semibold">
            <span>Administradores</span>
            <Crown className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-black text-purple-900 mt-1">{stats.admins}</p>
          <span className="inline-block px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-100 text-purple-800 uppercase mt-0.5">
            Acesso Total
          </span>
        </div>

        {/* Gestores */}
        <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-xs bg-blue-50/20">
          <div className="flex items-center justify-between text-blue-700 text-xs font-semibold">
            <span>Gestores</span>
            <Briefcase className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-blue-900 mt-1">{stats.gestores}</p>
          <span className="inline-block px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-100 text-blue-800 uppercase mt-0.5">
            Acesso Total
          </span>
        </div>

        {/* Chefes de Equipe */}
        <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-xs bg-amber-50/20">
          <div className="flex items-center justify-between text-amber-800 text-xs font-semibold">
            <span>Chefes de Equipe</span>
            <HardHat className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-900 mt-1">{stats.chefes}</p>
          <span className="inline-block px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 uppercase mt-0.5">
            Operacional
          </span>
        </div>

        {/* Ativos */}
        <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-xs bg-emerald-50/20">
          <div className="flex items-center justify-between text-emerald-700 text-xs font-semibold">
            <span>Ativos</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-900 mt-1">{stats.active}</p>
          <p className="text-[10px] text-emerald-600 mt-0.5">Com login habilitado</p>
        </div>

        {/* Inativos */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Inativos</span>
            <UserX className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-black text-slate-700 mt-1">{stats.inactive}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Acesso bloqueado</p>
        </div>
      </div>

      {/* SUB-VIEW 1: USERS LIST & MANAGEMENT */}
      {activeSubTab === 'users' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por nome, login, e-mail..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Role and Status Filters */}
            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 shrink-0">
                <button
                  onClick={() => setSelectedRoleFilter('ALL')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                    selectedRoleFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setSelectedRoleFilter('ADMIN')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                    selectedRoleFilter === 'ADMIN' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Admin
                </button>
                <button
                  onClick={() => setSelectedRoleFilter('GESTOR')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                    selectedRoleFilter === 'GESTOR' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Gestor
                </button>
                <button
                  onClick={() => setSelectedRoleFilter('CHEFE_EQUIPE')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                    selectedRoleFilter === 'CHEFE_EQUIPE' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Chefe
                </button>
              </div>

              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value as any)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">Status: Todos</option>
                <option value="ACTIVE">Apenas Ativos</option>
                <option value="INACTIVE">Apenas Inativos</option>
              </select>
            </div>
          </div>

          {/* Users Table / Grid */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Usuário</th>
                    <th className="py-3 px-4">Perfil de Acesso</th>
                    <th className="py-3 px-4">Login / Contato</th>
                    <th className="py-3 px-4">Equipe / Obras Vinculadas</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        Nenhum usuário encontrado com os filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => {
                      const isCurrent = currentUser?.id === user.id;
                      const associatedTeam = teams.find((t) => t.id === user.teamId);

                      return (
                        <tr
                          key={user.id}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            !user.active ? 'opacity-60 bg-slate-50/30' : ''
                          }`}
                        >
                          {/* User Avatar & Name */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center space-x-3">
                              <img
                                src={user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                                alt={user.name}
                                className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
                              />
                              <div>
                                <div className="flex items-center space-x-1.5">
                                  <span className="font-bold text-slate-900 text-sm">{user.name}</span>
                                  {isCurrent && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-100 text-blue-800 uppercase">
                                      Você
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-slate-400 block font-mono">
                                  @{user.username || user.email.split('@')[0]}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Role Badge & Quick Switcher */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-1">
                              {user.role === 'ADMIN' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
                                  <Crown className="w-3 h-3 text-purple-700" />
                                  Administrador
                                </span>
                              )}
                              {user.role === 'GESTOR' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                  <Briefcase className="w-3 h-3 text-blue-700" />
                                  Gestor
                                </span>
                              )}
                              {user.role === 'CHEFE_EQUIPE' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200">
                                  <HardHat className="w-3 h-3 text-amber-700" />
                                  Chefe de Equipe
                                </span>
                              )}

                              {(user.role === 'ADMIN' || user.role === 'GESTOR') && (
                                <p className="text-[10px] text-slate-400 font-medium">
                                  Acesso Total e Irrestrito
                                </p>
                              )}
                            </div>
                          </td>

                          {/* Contact */}
                          <td className="py-3.5 px-4 text-xs space-y-0.5">
                            <div className="flex items-center text-slate-600 gap-1.5">
                              <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate max-w-[160px]">{user.email}</span>
                            </div>
                            {user.phone && (
                              <div className="flex items-center text-slate-500 gap-1.5">
                                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span>{user.phone}</span>
                              </div>
                            )}
                          </td>

                          {/* Teams / Worksites Linked */}
                          <td className="py-3.5 px-4 text-xs">
                            {user.role === 'CHEFE_EQUIPE' ? (
                              <div className="space-y-1">
                                {associatedTeam ? (
                                  <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[11px] border border-slate-200">
                                    {associatedTeam.name}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 italic">Sem equipe principal</span>
                                )}
                                {user.assignedWorksiteIds && user.assignedWorksiteIds.length > 0 && (
                                  <p className="text-[10px] text-slate-500">
                                    {user.assignedWorksiteIds.length} obra(s) vinculada(s)
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded text-[11px] border border-emerald-200 inline-block">
                                Acesso a Todas as Equipes e Obras
                              </span>
                            )}
                          </td>

                          {/* Status Toggle Switch */}
                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => handleToggleStatus(user)}
                              title={user.active ? 'Clique para desativar usuário' : 'Clique para ativar usuário'}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition ${
                                user.active
                                  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                  : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                              }`}
                            >
                              {user.active ? (
                                <>
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                                  Ativo
                                </>
                              ) : (
                                <>
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                                  Inativo
                                </>
                              )}
                            </button>
                          </td>

                          {/* Action Buttons */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end space-x-1">
                              {/* Authorize 24h for Chefe de Campo */}
                              {user.role === 'CHEFE_EQUIPE' && (
                                <button
                                  onClick={() => handleOpenAuth24hForUser(user)}
                                  className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                                  title={`Conceder autorização administrativa 24h para ${user.name}`}
                                >
                                  <ShieldCheck className="w-4 h-4" />
                                </button>
                              )}

                              {/* Simulate Login As */}
                              {!isCurrent && (
                                <button
                                  onClick={() => loginAs(user.id)}
                                  className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                  title={`Entrar como ${user.name}`}
                                >
                                  <ArrowRightLeft className="w-4 h-4" />
                                </button>
                              )}

                              {/* Change Password */}
                              <button
                                onClick={() => handleOpenPasswordModal(user)}
                                className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                                title="Alterar Senha"
                              >
                                <KeyRound className="w-4 h-4" />
                              </button>

                              {/* Edit Profile */}
                              <button
                                onClick={() => handleOpenEditModal(user)}
                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                title="Editar Cadastro & Permissões"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>

                              {/* Delete User */}
                              {!isCurrent && (
                                <button
                                  onClick={() => setDeleteConfirmUser(user)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                  title="Excluir Usuário"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: PERMISSIONS MATRIX (COMPARAÇÃO 100% IDÊNTICA ADMIN & GESTOR) */}
      {activeSubTab === 'matrix' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Matriz Comparativa de Perfis e Permissões
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Os perfis <strong>Administrador</strong> e <strong>Gestor</strong> possuem exatamente as mesmas permissões, com acesso total a todas as funcionalidades da plataforma.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                Admin: Acesso Total
              </span>
              <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                Gestor: Acesso Total
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Funcionalidade / Módulo</th>
                  <th className="py-3 px-4 text-center text-purple-700">Administrador</th>
                  <th className="py-3 px-4 text-center text-blue-700">Gestor</th>
                  <th className="py-3 px-4 text-center text-amber-800">Chefe de Equipe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {permissionsList.map((p, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4 font-medium text-slate-800">{p.name}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {p.chefe ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-400">
                          <X className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-VIEW 3: 24-HOUR ADMINISTRATIVE AUTHORIZATIONS MANAGEMENT */}
      {activeSubTab === 'auth24h' && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="bg-white border border-amber-200 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-amber-50/40 via-white to-amber-50/20">
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                  Autorização de 24 Horas
                </span>
                <span className="text-xs text-amber-700 font-semibold">
                  Elevação Temporária Segura & Auditada
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 mt-1">
                Sessões de Autorização Administrativa (24h)
              </h2>
              <p className="text-xs text-slate-600 mt-0.5 max-w-3xl leading-relaxed">
                Permite que <strong>Administradores e Gestores</strong> concedam acesso administrativo total temporário para <strong>Chefes de Campo</strong> por exatamente <strong>24 horas</strong>. A autorização é validada pelo backend, persiste após fechar o navegador/reiniciar e expira pontualmente ou mediante encerramento manual.
              </p>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                onClick={loadSessions}
                disabled={loadingSessions}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center space-x-1.5"
                title="Atualizar sessões"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingSessions ? 'animate-spin' : ''}`} />
                <span>Atualizar</span>
              </button>
              <button
                onClick={() => {
                  setAuth24hTargetUser(null);
                  setAuth24hModalOpen(true);
                }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center space-x-1.5 transition active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Conceder Nova Autorização 24h</span>
              </button>
            </div>
          </div>

          {/* Active Sessions Grid */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>Sessões Registradas</span>
            </h3>

            {loadingSessions ? (
              <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl text-slate-500 text-xs">
                Carregando sessões de autorização...
              </div>
            ) : sessionsList.length === 0 ? (
              <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl text-slate-400 text-xs space-y-2">
                <ShieldCheck className="w-8 h-8 mx-auto text-slate-300" />
                <p>Nenhuma sessão de autorização administrativa temporária ativa ou recente.</p>
                <button
                  onClick={() => {
                    setAuth24hTargetUser(null);
                    setAuth24hModalOpen(true);
                  }}
                  className="mt-2 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition"
                >
                  Conceder Autorização 24h
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sessionsList.map((session) => {
                  const now = Date.now();
                  const isAlive = session.active && session.expiresAtTimestamp > now;
                  const remainingMs = Math.max(0, session.expiresAtTimestamp - now);
                  const totalSeconds = Math.floor(remainingMs / 1000);
                  const hours = Math.floor(totalSeconds / 3600);
                  const minutes = Math.floor((totalSeconds % 3600) / 60);
                  const seconds = totalSeconds % 60;
                  const timeFormatted = `${hours}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;

                  return (
                    <div
                      key={session.id}
                      className={`p-5 rounded-2xl border transition-all ${
                        isAlive
                          ? 'bg-white border-amber-300 shadow-md ring-1 ring-amber-200'
                          : 'bg-slate-50/70 border-slate-200 opacity-70'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                              isAlive ? 'bg-amber-100 text-amber-900' : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            <ShieldCheck className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="font-bold text-slate-900 text-sm">{session.userName}</h4>
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 uppercase">
                                {session.userRole === 'ADMIN' ? 'Admin' : session.userRole === 'GESTOR' ? 'Gestor' : 'Chefe de Campo'}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Autorizado por: <strong className="text-slate-700">{session.authorizedByName}</strong> ({session.authorizedByRole})
                            </p>
                          </div>
                        </div>

                        {/* Status badge */}
                        <div>
                          {isAlive ? (
                            <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                              {timeFormatted}
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-700">
                              {session.revokedAt ? 'Revogada' : 'Expirada (24h)'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Details & Dates */}
                      <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-slate-400 block font-semibold">Emitida em:</span>
                          <span className="text-slate-700 font-medium">
                            {new Date(session.issuedAt).toLocaleString('pt-BR')}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-semibold">Expira em:</span>
                          <span className="text-slate-700 font-medium">
                            {new Date(session.expiresAt).toLocaleString('pt-BR')}
                          </span>
                        </div>
                      </div>

                      {session.reason && (
                        <div className="mt-2.5 bg-slate-50 p-2 rounded-lg border border-slate-100 text-[11px] text-slate-600">
                          <strong className="text-slate-700">Justificativa:</strong> {session.reason}
                        </div>
                      )}

                      {session.revokedAt && (
                        <div className="mt-2 bg-rose-50 p-2 rounded-lg border border-rose-100 text-[11px] text-rose-700">
                          <strong>Revogado em:</strong> {new Date(session.revokedAt).toLocaleString('pt-BR')} por {session.revokedBy || 'Usuário'}
                          {session.revocationReason && ` (${session.revocationReason})`}
                        </div>
                      )}

                      {/* Card Action */}
                      {isAlive && (
                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end">
                          <button
                            onClick={() => handleRevokeSession(session)}
                            className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-bold transition flex items-center space-x-1"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Revogar Imediatamente</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Security & Architecture Guarantees */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-600 space-y-2">
            <h4 className="font-bold text-slate-800 flex items-center space-x-1.5">
              <Lock className="w-4 h-4 text-slate-700" />
              <span>Garantias de Segurança e Integração</span>
            </h4>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600">
              <li><strong>Sem banco de dados paralelo:</strong> Integração direta com a base principal de usuários e registro auditado.</li>
              <li><strong>Segurança de senhas:</strong> Nenhuma senha ou hash é exposta no frontend ou salva no localStorage.</li>
              <li><strong>Persistência de 24h:</strong> A autorização permanece válida mesmo ao fechar o navegador ou reiniciar a máquina do usuário.</li>
              <li><strong>Controle de expiração:</strong> Expira exatamente 24 horas após sua concessão ou ao efetuar logout/troca de perfil.</li>
            </ul>
          </div>
        </div>
      )}

      {/* MODAL 1: CREATE / EDIT USER */}
      {userModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto border border-slate-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200 sticky top-0 bg-white z-10">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  {editingUser ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingUser ? `Editar Usuário: ${editingUser.name}` : 'Cadastrar Novo Usuário'}
                </h3>
              </div>
              <button
                onClick={() => setUserModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveUser} className="p-5 space-y-4 text-xs">
              {/* Profile Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Perfil de Acesso do Usuário *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: 'ADMIN' })}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      formData.role === 'ADMIN'
                        ? 'border-purple-500 bg-purple-50 text-purple-900 ring-2 ring-purple-400'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1 text-purple-700 font-bold text-xs mb-0.5">
                      <Crown className="w-3.5 h-3.5" />
                      <span>Administrador</span>
                    </div>
                    <p className="text-[10px] text-slate-500">Acesso total e irrestrito</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: 'GESTOR' })}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      formData.role === 'GESTOR'
                        ? 'border-blue-500 bg-blue-50 text-blue-900 ring-2 ring-blue-400'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1 text-blue-700 font-bold text-xs mb-0.5">
                      <Briefcase className="w-3.5 h-3.5" />
                      <span>Gestor</span>
                    </div>
                    <p className="text-[10px] text-slate-500">Acesso total e irrestrito</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: 'CHEFE_EQUIPE' })}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      formData.role === 'CHEFE_EQUIPE'
                        ? 'border-amber-500 bg-amber-50 text-amber-900 ring-2 ring-amber-400'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1 text-amber-700 font-bold text-xs mb-0.5">
                      <HardHat className="w-3.5 h-3.5" />
                      <span>Chefe Equipe</span>
                    </div>
                    <p className="text-[10px] text-slate-500">Acesso de campo</p>
                  </button>
                </div>
              </div>

              {/* Basic Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nome Completo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Luiz Henrique"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Login / Nome de Usuário</label>
                  <input
                    type="text"
                    placeholder="Ex: luiz.henrique"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">E-mail Corporativo *</label>
                  <input
                    type="email"
                    required
                    placeholder="usuario@obrastotal.com.br"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="(41) 99888-0000"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {editingUser ? 'Alterar Senha (deixe em branco para manter a atual)' : 'Senha de Acesso *'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder={editingUser ? '••••••••' : 'Defina uma senha'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Chefe de Equipe - Team Assignment */}
              {formData.role === 'CHEFE_EQUIPE' && (
                <div className="p-3 bg-amber-50/50 border border-amber-200 rounded-xl space-y-2">
                  <label className="block font-bold text-amber-900 text-xs">
                    Equipe Principal Vinculada *
                  </label>
                  <select
                    value={formData.teamId}
                    onChange={(e) => setFormData({ ...formData, teamId: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold"
                  >
                    <option value="">Selecione a equipe de campo...</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Active Status */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <p className="font-bold text-slate-800">Conta Ativa</p>
                  <p className="text-[10px] text-slate-500">
                    Se desativado, o usuário não conseguirá efetuar login no sistema.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setUserModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 font-bold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-white bg-blue-600 hover:bg-blue-700 font-bold transition shadow-xs"
                >
                  {editingUser ? 'Salvar Alterações' : 'Cadastrar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CHANGE PASSWORD */}
      {passwordModalOpen && passwordTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Alterar Senha</h3>
                  <p className="text-[11px] text-slate-500">{passwordTargetUser.name}</p>
                </div>
              </div>
              <button
                onClick={() => setPasswordModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPassword} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nova Senha</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Mínimo 4 caracteres"
                  value={newPasswordValue}
                  onChange={(e) => setNewPasswordValue(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Confirmar Nova Senha</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Repita a nova senha"
                  value={confirmPasswordValue}
                  onChange={(e) => setConfirmPasswordValue(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="chk-show-pass"
                  checked={showPassword}
                  onChange={(e) => setShowPassword(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="chk-show-pass" className="text-slate-600 cursor-pointer">
                  Mostrar senhas
                </label>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setPasswordModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 font-bold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-white bg-amber-600 hover:bg-amber-700 font-bold transition shadow-xs"
                >
                  Confirmar Nova Senha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: DELETE CONFIRMATION */}
      {deleteConfirmUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-rose-200 p-5 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Excluir Usuário</h3>
                <p className="text-xs text-slate-500">
                  Tem certeza que deseja remover o usuário <strong>{deleteConfirmUser.name}</strong>? Esta ação não pode ser desfeita.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteConfirmUser(null)}
                className="px-4 py-2 rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 font-bold transition text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl text-white bg-rose-600 hover:bg-rose-700 font-bold transition text-xs shadow-xs"
              >
                Sim, Excluir Usuário
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 24-HOUR ADMINISTRATIVE AUTHORIZATION MODAL */}
      <Admin24hAuthModal
        isOpen={auth24hModalOpen}
        onClose={() => {
          setAuth24hModalOpen(false);
          loadSessions();
        }}
        targetUser={auth24hTargetUser}
        onSuccess={(msg) => {
          showNotification(msg);
          loadSessions();
        }}
      />
    </div>
  );
};
