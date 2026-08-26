import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { User, UserRole, AdminAuthSession } from '../types';
import { INITIAL_USERS } from '../data/mockData';
import {
  createUser as apiCreateUser,
  updateUser as apiUpdateUser,
  deleteUser as apiDeleteUser,
  toggleUserStatus as apiToggleUserStatus,
  changeUserPassword as apiChangeUserPassword,
  requestOrGrant24hAdminAuth,
  verify24hAdminAuth,
  revoke24hAdminAuth,
} from '../services/api';

interface AuthContextType {
  currentUser: User;
  allUsers: User[];
  isAdmin: boolean;
  isGestor: boolean;
  isChefe: boolean;
  isLeader: boolean;
  hasFullAccess: boolean;
  roleLabel: string;
  // 24-Hour Administrative Authorization
  adminAuthSession: AdminAuthSession | null;
  isTemporarilyAuthorized: boolean;
  adminAuthRemainingMs: number;
  adminAuthRemainingFormatted: string;
  requestAdminAuth: (
    authorizerId: string,
    passwordOrPin: string,
    reason?: string,
    targetUserId?: string
  ) => Promise<{ success: boolean; session: AdminAuthSession; message: string }>;
  revokeAdminAuth: (reason?: string) => Promise<boolean>;
  checkAdminAuthStatus: () => Promise<void>;
  // User Management Actions
  setCurrentUser: (user: User) => void;
  loginAs: (userId: string) => void;
  updateCurrentUserProfile: (updated: Partial<User>) => void;
  setAllUsers: React.Dispatch<React.SetStateAction<User[]>>;
  addNewUser: (userData: Partial<User>) => Promise<User>;
  editUser: (userId: string, data: Partial<User>) => Promise<User>;
  removeUser: (userId: string) => Promise<boolean>;
  toggleStatus: (userId: string) => Promise<boolean>;
  changePassword: (userId: string, newPass: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_USER_KEY = 'obras_current_user_v2';
const USERS_LIST_KEY = 'obras_users_list_v2';
const ADMIN_AUTH_TOKEN_KEY = 'obras_admin_auth_token_v2';
const ADMIN_AUTH_SESSION_KEY = 'obras_admin_auth_session_v2';

function formatRemainingTime(ms: number): string {
  if (ms <= 0) return '00h 00m 00s (Expirado)';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [allUsers, setAllUsers] = useState<User[]>(() => {
    try {
      const cached = localStorage.getItem(USERS_LIST_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return INITIAL_USERS || [];
  });

  const [currentUser, setCurrentUserState] = useState<User>(() => {
    try {
      const saved = localStorage.getItem(AUTH_USER_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const exists = (INITIAL_USERS || []).find((u) => u.id === parsed.id);
        if (exists) return exists;
      }
    } catch (e) {
      console.error(e);
    }
    // Default to Luiz Henrique (Administrator)
    return INITIAL_USERS[0];
  });

  // 24-Hour Administrative Authorization States
  const [adminAuthSession, setAdminAuthSession] = useState<AdminAuthSession | null>(() => {
    try {
      const saved = localStorage.getItem(ADMIN_AUTH_SESSION_KEY);
      if (saved) {
        const parsed: AdminAuthSession = JSON.parse(saved);
        if (parsed && parsed.expiresAtTimestamp > Date.now() && parsed.active) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to parse cached admin auth session:', e);
    }
    return null;
  });

  const [adminAuthRemainingMs, setAdminAuthRemainingMs] = useState<number>(() => {
    if (adminAuthSession && adminAuthSession.expiresAtTimestamp > Date.now()) {
      return Math.max(0, adminAuthSession.expiresAtTimestamp - Date.now());
    }
    return 0;
  });

  const isTemporarilyAuthorized = !!(
    adminAuthSession &&
    adminAuthSession.active &&
    adminAuthRemainingMs > 0 &&
    adminAuthSession.userId === currentUser.id
  );

  // Keep local storage in sync for users
  useEffect(() => {
    try {
      localStorage.setItem(USERS_LIST_KEY, JSON.stringify(allUsers));
    } catch (e) {
      console.error(e);
    }
  }, [allUsers]);

  // Sync and persist admin auth session state to storage
  useEffect(() => {
    try {
      if (adminAuthSession && adminAuthSession.active && adminAuthRemainingMs > 0) {
        localStorage.setItem(ADMIN_AUTH_SESSION_KEY, JSON.stringify(adminAuthSession));
        localStorage.setItem(ADMIN_AUTH_TOKEN_KEY, adminAuthSession.token);
      } else {
        localStorage.removeItem(ADMIN_AUTH_SESSION_KEY);
        localStorage.removeItem(ADMIN_AUTH_TOKEN_KEY);
      }
    } catch (e) {
      console.error(e);
    }
  }, [adminAuthSession, adminAuthRemainingMs]);

  // Check validity against backend
  const checkAdminAuthStatus = useCallback(async () => {
    const token = localStorage.getItem(ADMIN_AUTH_TOKEN_KEY) || adminAuthSession?.token;
    if (!token) {
      if (adminAuthSession) {
        setAdminAuthSession(null);
        setAdminAuthRemainingMs(0);
      }
      return;
    }

    try {
      const res = await verify24hAdminAuth(token, currentUser.id);
      if (res.valid && res.session) {
        setAdminAuthSession(res.session);
        setAdminAuthRemainingMs(res.remainingMs || Math.max(0, res.session.expiresAtTimestamp - Date.now()));
      } else {
        // Expired, revoked, or invalidated
        setAdminAuthSession(null);
        setAdminAuthRemainingMs(0);
        localStorage.removeItem(ADMIN_AUTH_SESSION_KEY);
        localStorage.removeItem(ADMIN_AUTH_TOKEN_KEY);
      }
    } catch (err) {
      console.error('Error verifying 24h admin session:', err);
    }
  }, [currentUser.id, adminAuthSession?.token]);

  // Verify on initial mount and when current user changes
  useEffect(() => {
    checkAdminAuthStatus();
  }, [currentUser.id]);

  // Real-time 1-second countdown ticker for exact 24-hour expiration
  useEffect(() => {
    if (!adminAuthSession || !adminAuthSession.active) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, adminAuthSession.expiresAtTimestamp - now);
      setAdminAuthRemainingMs(remaining);

      if (remaining <= 0) {
        // Expired exactly after 24 hours
        setAdminAuthSession((prev) => (prev ? { ...prev, active: false } : null));
        localStorage.removeItem(ADMIN_AUTH_SESSION_KEY);
        localStorage.removeItem(ADMIN_AUTH_TOKEN_KEY);
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [adminAuthSession]);

  const setCurrentUser = (user: User) => {
    setCurrentUserState(user);
    try {
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    } catch (e) {
      console.error(e);
    }
  };

  const loginAs = (userId: string) => {
    const user = (allUsers || []).find((u) => u.id === userId);
    if (user) {
      // Invalidate existing temporary session if switching to another user
      if (adminAuthSession && adminAuthSession.userId !== userId) {
        try {
          revoke24hAdminAuth({
            token: adminAuthSession.token,
            revokedByUserId: currentUser.id,
            reason: `Troca de conta para ${user.name}`,
          });
        } catch (e) {
          console.error(e);
        }
        setAdminAuthSession(null);
        setAdminAuthRemainingMs(0);
        localStorage.removeItem(ADMIN_AUTH_SESSION_KEY);
        localStorage.removeItem(ADMIN_AUTH_TOKEN_KEY);
      }

      setCurrentUser(user);
    }
  };

  // Request or Grant 24-hour Admin Authorization
  const requestAdminAuth = async (
    authorizerId: string,
    passwordOrPin: string,
    reason?: string,
    targetUserId?: string
  ): Promise<{ success: boolean; session: AdminAuthSession; message: string }> => {
    const target = targetUserId || currentUser.id;
    const res = await requestOrGrant24hAdminAuth({
      targetUserId: target,
      authorizerId,
      passwordOrPin,
      reason,
    });

    if (res.success && res.session) {
      if (target === currentUser.id) {
        setAdminAuthSession(res.session);
        setAdminAuthRemainingMs(res.session.expiresAtTimestamp - Date.now());
        localStorage.setItem(ADMIN_AUTH_SESSION_KEY, JSON.stringify(res.session));
        localStorage.setItem(ADMIN_AUTH_TOKEN_KEY, res.session.token);
      }
    }
    return res;
  };

  // Manually revoke 24-hour Admin Authorization
  const revokeAdminAuth = async (reason?: string): Promise<boolean> => {
    try {
      const token = adminAuthSession?.token || localStorage.getItem(ADMIN_AUTH_TOKEN_KEY);
      if (token) {
        await revoke24hAdminAuth({
          token,
          revokedByUserId: currentUser.id,
          reason: reason || 'Encerrado manualmente pelo usuário',
        });
      }
      setAdminAuthSession(null);
      setAdminAuthRemainingMs(0);
      localStorage.removeItem(ADMIN_AUTH_SESSION_KEY);
      localStorage.removeItem(ADMIN_AUTH_TOKEN_KEY);
      return true;
    } catch (err) {
      console.error('Error revoking admin auth:', err);
      setAdminAuthSession(null);
      setAdminAuthRemainingMs(0);
      localStorage.removeItem(ADMIN_AUTH_SESSION_KEY);
      localStorage.removeItem(ADMIN_AUTH_TOKEN_KEY);
      return true;
    }
  };

  const updateCurrentUserProfile = (updated: Partial<User>) => {
    const newObj = { ...currentUser, ...updated };
    setCurrentUser(newObj);
    setAllUsers((prev) => (prev || []).map((u) => (u.id === newObj.id ? newObj : u)));
  };

  const addNewUser = async (userData: Partial<User>): Promise<User> => {
    try {
      const created = await apiCreateUser(userData, currentUser);
      setAllUsers((prev) => [...prev, created]);
      return created;
    } catch (err) {
      // Fallback local creation
      const localNew: User = {
        id: `user-${Date.now()}`,
        name: userData.name || 'Novo Usuário',
        username: userData.username || (userData.name ? userData.name.toLowerCase().replace(/\s+/g, '.') : `user.${Date.now()}`),
        email: userData.email || '',
        role: userData.role || 'CHEFE_EQUIPE',
        phone: userData.phone || '',
        active: userData.active !== undefined ? userData.active : true,
        password: userData.password || '123456',
        teamId: userData.teamId || '',
        assignedTeamIds: userData.assignedTeamIds || [],
        assignedWorksiteIds: userData.assignedWorksiteIds || [],
        avatarUrl: `https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80`,
        createdAt: new Date().toISOString().split('T')[0],
      };
      setAllUsers((prev) => [...prev, localNew]);
      return localNew;
    }
  };

  const editUser = async (userId: string, data: Partial<User>): Promise<User> => {
    try {
      const updated = await apiUpdateUser(userId, data, currentUser);
      setAllUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...updated } : u)));
      if (currentUser.id === userId) {
        setCurrentUserState((prev) => ({ ...prev, ...updated }));
      }
      return updated;
    } catch (err) {
      setAllUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, ...data } : u))
      );
      if (currentUser.id === userId) {
        setCurrentUserState((prev) => ({ ...prev, ...data }));
      }
      const existing = allUsers.find((u) => u.id === userId);
      return { ...existing, ...data } as User;
    }
  };

  const removeUser = async (userId: string): Promise<boolean> => {
    try {
      await apiDeleteUser(userId, currentUser);
      setAllUsers((prev) => prev.filter((u) => u.id !== userId));
      return true;
    } catch (err) {
      setAllUsers((prev) => prev.filter((u) => u.id !== userId));
      return true;
    }
  };

  const toggleStatus = async (userId: string): Promise<boolean> => {
    try {
      const result = await apiToggleUserStatus(userId, currentUser);
      if (result && result.user) {
        setAllUsers((prev) => prev.map((u) => (u.id === userId ? result.user : u)));
        if (currentUser.id === userId) {
          setCurrentUserState(result.user);
          // If current user is deactivated, revoke temporary auth
          if (!result.user.active && adminAuthSession) {
            revokeAdminAuth('Usuário foi desativado');
          }
        }
      }
      return true;
    } catch (err) {
      setAllUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, active: !u.active } : u))
      );
      return true;
    }
  };

  const changePassword = async (userId: string, newPass: string): Promise<boolean> => {
    try {
      await apiChangeUserPassword(userId, newPass, currentUser);
      setAllUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, password: newPass } : u))
      );
      return true;
    } catch (err) {
      setAllUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, password: newPass } : u))
      );
      return true;
    }
  };

  // Administrador and Gestor have EXACT SAME permissions and access.
  // When 24-hour temporary authorization is active, elevation gives full access as well.
  const hasFullAccess =
    currentUser?.role === 'ADMIN' ||
    currentUser?.role === 'GESTOR' ||
    isTemporarilyAuthorized;

  const isAdmin = hasFullAccess;
  const isGestor = currentUser?.role === 'GESTOR';
  const isChefe = currentUser?.role === 'CHEFE_EQUIPE';
  const isLeader = currentUser?.role === 'CHEFE_EQUIPE';

  const roleLabel =
    currentUser?.role === 'ADMIN'
      ? 'Administrador'
      : currentUser?.role === 'GESTOR'
      ? 'Gestor'
      : isTemporarilyAuthorized
      ? 'Chefe de Equipe (Autorizado 24h)'
      : 'Chefe de Equipe';

  const adminAuthRemainingFormatted = formatRemainingTime(adminAuthRemainingMs);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        allUsers: allUsers || [],
        isAdmin,
        isGestor,
        isChefe,
        isLeader,
        hasFullAccess,
        roleLabel,
        adminAuthSession,
        isTemporarilyAuthorized,
        adminAuthRemainingMs,
        adminAuthRemainingFormatted,
        requestAdminAuth,
        revokeAdminAuth,
        checkAdminAuthStatus,
        setCurrentUser,
        loginAs,
        updateCurrentUserProfile,
        setAllUsers,
        addNewUser,
        editUser,
        removeUser,
        toggleStatus,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};


