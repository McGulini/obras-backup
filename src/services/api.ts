import { User, Helper, Team, Worksite, DailyLog, Occurrence, AuditLog, Appointment, AppointmentStatus, AdminAuthSession, GpsPoint, GpsDayTrajectory, GpsLatestLocation } from '../types';
import {
  INITIAL_USERS,
  INITIAL_HELPERS,
  INITIAL_TEAMS,
  INITIAL_WORKSITES,
  INITIAL_DAILY_LOGS,
  INITIAL_AUDIT_LOGS,
  INITIAL_APPOINTMENTS,
} from '../data/mockData';

const STORAGE_KEYS = {
  OFFLINE_LOGS_QUEUE: 'obras_offline_logs_queue_v1',
  LOCAL_BOOTSTRAP_CACHE: 'obras_bootstrap_cache_v1',
};

// Check if online
export function isNetworkOnline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine;
}

// Get offline queue
export function getOfflineQueue(): DailyLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.OFFLINE_LOGS_QUEUE);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// Add to offline queue
export function enqueueOfflineLog(log: DailyLog): void {
  const queue = getOfflineQueue() || [];
  const existingIdx = queue.findIndex((q) => q.id === log.id);
  if (existingIdx >= 0) {
    queue[existingIdx] = log;
  } else {
    queue.push(log);
  }
  localStorage.setItem(STORAGE_KEYS.OFFLINE_LOGS_QUEUE, JSON.stringify(queue));
}

// Clear offline queue
export function clearOfflineQueue(): void {
  localStorage.removeItem(STORAGE_KEYS.OFFLINE_LOGS_QUEUE);
}

// Default fallback data object
const DEFAULT_FALLBACK_DATA = {
  users: INITIAL_USERS,
  helpers: INITIAL_HELPERS,
  teams: INITIAL_TEAMS,
  worksites: INITIAL_WORKSITES,
  dailyLogs: INITIAL_DAILY_LOGS,
  auditLogs: INITIAL_AUDIT_LOGS,
  appointments: INITIAL_APPOINTMENTS,
};

// Fetch all bootstrap data
export async function fetchBootstrapData(): Promise<{
  users: User[];
  helpers: Helper[];
  teams: Team[];
  worksites: Worksite[];
  dailyLogs: DailyLog[];
  auditLogs: AuditLog[];
  appointments: Appointment[];
}> {
  try {
    const res = await fetch('/api/bootstrap');
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    if (data && data.dailyLogs) {
      localStorage.setItem(STORAGE_KEYS.LOCAL_BOOTSTRAP_CACHE, JSON.stringify(data));
      return {
        users: data.users || INITIAL_USERS,
        helpers: data.helpers || INITIAL_HELPERS,
        teams: data.teams || INITIAL_TEAMS,
        worksites: data.worksites || INITIAL_WORKSITES,
        dailyLogs: data.dailyLogs || INITIAL_DAILY_LOGS,
        auditLogs: data.auditLogs || INITIAL_AUDIT_LOGS,
        appointments: data.appointments || INITIAL_APPOINTMENTS,
      };
    }
    return DEFAULT_FALLBACK_DATA;
  } catch (err) {
    console.warn('Using cached data due to network error:', err);
    try {
      const cached = localStorage.getItem(STORAGE_KEYS.LOCAL_BOOTSTRAP_CACHE);
      if (cached) {
        const parsed = JSON.parse(cached);
        return {
          users: parsed.users || INITIAL_USERS,
          helpers: parsed.helpers || INITIAL_HELPERS,
          teams: parsed.teams || INITIAL_TEAMS,
          worksites: parsed.worksites || INITIAL_WORKSITES,
          dailyLogs: parsed.dailyLogs || INITIAL_DAILY_LOGS,
          auditLogs: parsed.auditLogs || INITIAL_AUDIT_LOGS,
          appointments: parsed.appointments || INITIAL_APPOINTMENTS,
        };
      }
    } catch (cacheErr) {
      console.warn('Error reading cache:', cacheErr);
    }
    return DEFAULT_FALLBACK_DATA;
  }
}

// Save Daily Log
export async function saveDailyLog(log: Partial<DailyLog>, currentUser?: User): Promise<DailyLog> {
  const payload = { ...log, user: currentUser };
  if (!isNetworkOnline()) {
    const offlineLog: DailyLog = {
      ...(log as DailyLog),
      id: log.id || `offline-log-${Date.now()}`,
      synced: false,
      createdAt: log.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    enqueueOfflineLog(offlineLog);
    return offlineLog;
  }

  try {
    const method = log.id && !log.id.startsWith('offline-') ? 'PUT' : 'POST';
    const url = method === 'PUT' ? `/api/daily-logs/${log.id}` : '/api/daily-logs';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Falha ao salvar registro diário no servidor');
    return await res.json();
  } catch (err) {
    console.warn('Erro ao salvar no servidor, enfileirando offline:', err);
    const fallbackLog: DailyLog = {
      ...(log as DailyLog),
      id: log.id || `offline-log-${Date.now()}`,
      synced: false,
      createdAt: log.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    enqueueOfflineLog(fallbackLog);
    return fallbackLog;
  }
}

// Sync offline queue
export async function syncOfflineLogs(currentUser?: User): Promise<{ count: number; items: DailyLog[] }> {
  const queue = getOfflineQueue() || [];
  if (queue.length === 0) return { count: 0, items: [] };

  try {
    const res = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pendingLogs: queue, user: currentUser }),
    });

    if (!res.ok) throw new Error('Erro ao sincronizar fila offline com o servidor');
    const result = await res.json();
    clearOfflineQueue();
    return result;
  } catch (err) {
    console.warn('Failed to sync offline items:', err);
    return { count: 0, items: [] };
  }
}

// Update Occurrence status & resolution
export async function updateOccurrenceStatus(
  occurrenceId: string,
  update: {
    status: Occurrence['status'];
    adminObservation?: string;
    assignedAdminName?: string;
    user?: User;
  }
): Promise<Occurrence> {
  const res = await fetch(`/api/occurrences/${occurrenceId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(update),
  });
  if (!res.ok) throw new Error('Falha ao atualizar status da ocorrência');
  return await res.json();
}

// Teams CRUD
export async function createTeam(team: Partial<Team>, user?: User): Promise<Team> {
  const res = await fetch('/api/teams', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...team, user }),
  });
  if (!res.ok) throw new Error('Erro ao cadastrar equipe');
  return await res.json();
}

export async function updateTeam(id: string, team: Partial<Team>, user?: User): Promise<Team> {
  const res = await fetch(`/api/teams/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...team, user }),
  });
  if (!res.ok) throw new Error('Erro ao editar equipe');
  return await res.json();
}

// Worksites CRUD
export async function createWorksite(worksite: Partial<Worksite>, user?: User): Promise<Worksite> {
  const res = await fetch('/api/worksites', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...worksite, user }),
  });
  if (!res.ok) throw new Error('Erro ao cadastrar obra');
  return await res.json();
}

export async function updateWorksite(id: string, worksite: Partial<Worksite>, user?: User): Promise<Worksite> {
  const res = await fetch(`/api/worksites/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...worksite, user }),
  });
  if (!res.ok) throw new Error('Erro ao editar obra');
  return await res.json();
}

// Helpers CRUD
export async function createHelper(helper: Partial<Helper>, user?: User): Promise<Helper> {
  const res = await fetch('/api/helpers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...helper, user }),
  });
  if (!res.ok) throw new Error('Erro ao cadastrar ajudante');
  return await res.json();
}

export async function updateHelper(id: string, helper: Partial<Helper>, user?: User): Promise<Helper> {
  const res = await fetch(`/api/helpers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...helper, user }),
  });
  if (!res.ok) throw new Error('Erro ao editar ajudante');
  return await res.json();
}

export async function deleteHelper(id: string, user?: User): Promise<void> {
  const res = await fetch(`/api/helpers/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Erro ao remover ajudante');
  }
}

// Appointments CRUD
export async function createAppointment(
  appointment: Partial<Appointment>,
  user?: User,
  forceConflictOverride?: boolean
): Promise<Appointment> {
  const res = await fetch('/api/appointments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...appointment, user, forceConflictOverride }),
  });
  if (!res.ok) throw new Error('Erro ao cadastrar agendamento de serviço');
  return await res.json();
}

export async function updateAppointment(
  id: string,
  appointment: Partial<Appointment>,
  user?: User,
  forceConflictOverride?: boolean
): Promise<Appointment> {
  const res = await fetch(`/api/appointments/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...appointment, user, forceConflictOverride }),
  });
  if (!res.ok) throw new Error('Erro ao atualizar agendamento');
  return await res.json();
}

export async function deleteAppointment(id: string, user?: User): Promise<void> {
  const res = await fetch(`/api/appointments/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user }),
  });
  if (!res.ok) throw new Error('Erro ao remover agendamento');
}

export async function updateAppointmentStatus(
  id: string,
  status: AppointmentStatus,
  user?: User
): Promise<Appointment> {
  const res = await fetch(`/api/appointments/${id}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, user }),
  });
  if (!res.ok) throw new Error('Erro ao atualizar status do agendamento');
  return await res.json();
}

// Users CRUD (Full Admin and Gestor privileges)
export async function createUser(userData: Partial<User>, user?: User): Promise<User> {
  const res = await fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...userData, user }),
  });
  if (!res.ok) throw new Error('Erro ao cadastrar novo usuário');
  return await res.json();
}

export async function updateUser(id: string, userData: Partial<User>, user?: User): Promise<User> {
  const res = await fetch(`/api/users/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...userData, user }),
  });
  if (!res.ok) throw new Error('Erro ao atualizar usuário');
  return await res.json();
}

export async function deleteUser(id: string, user?: User): Promise<void> {
  const res = await fetch(`/api/users/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user }),
  });
  if (!res.ok) throw new Error('Erro ao remover usuário');
}

export async function toggleUserStatus(id: string, user?: User): Promise<{ success: boolean; user: User }> {
  const res = await fetch(`/api/users/${id}/toggle-status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user }),
  });
  if (!res.ok) throw new Error('Erro ao alterar status do usuário');
  return await res.json();
}

export async function changeUserPassword(id: string, newPassword: string, user?: User): Promise<void> {
  const res = await fetch(`/api/users/${id}/change-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ newPassword, user }),
  });
  if (!res.ok) throw new Error('Erro ao alterar senha do usuário');
}

// 24-Hour Administrative Authorization API
export async function requestOrGrant24hAdminAuth(params: {
  targetUserId?: string;
  authorizerId?: string;
  authorizerEmail?: string;
  passwordOrPin: string;
  reason?: string;
}): Promise<{ success: boolean; session: AdminAuthSession; message: string }> {
  const res = await fetch('/api/auth/admin-session/request-or-grant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Falha ao conceder autorização administrativa');
  }
  return data;
}

export async function verify24hAdminAuth(
  token: string,
  userId?: string
): Promise<{
  valid: boolean;
  reason?: string;
  message?: string;
  session?: AdminAuthSession;
  remainingMs?: number;
  remainingFormatted?: string;
}> {
  try {
    const query = new URLSearchParams({ token, ...(userId ? { userId } : {}) });
    const res = await fetch(`/api/auth/admin-session/verify?${query.toString()}`);
    if (!res.ok) return { valid: false, reason: 'NETWORK_ERROR' };
    return await res.json();
  } catch (err) {
    console.error('Error verifying 24h admin session:', err);
    return { valid: false, reason: 'NETWORK_ERROR' };
  }
}

export async function revoke24hAdminAuth(params: {
  token?: string;
  targetUserId?: string;
  revokedByUserId?: string;
  reason?: string;
}): Promise<{ success: boolean; message: string }> {
  const res = await fetch('/api/auth/admin-session/revoke', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error('Erro ao revogar autorização');
  return await res.json();
}

export async function fetch24hAdminSessions(): Promise<AdminAuthSession[]> {
  try {
    const res = await fetch('/api/auth/admin-session/sessions');
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

// Reset Demo Data
export async function resetDemoData(): Promise<void> {
  try {
    await fetch('/api/reset-data', { method: 'POST' });
    clearOfflineQueue();
    localStorage.removeItem(STORAGE_KEYS.LOCAL_BOOTSTRAP_CACHE);
  } catch (err) {
    console.error('Reset failed:', err);
  }
}

// ==========================================
// GPS REAL BREADCRUMB TRAJECTORY API
// STRICTLY REAL SENSOR POINTS - NO ROUTING CALCULATIONS
// ==========================================

export async function fetchGpsPoints(params: {
  date?: string;
  userId?: string;
  teamId?: string;
}): Promise<GpsPoint[]> {
  try {
    const query = new URLSearchParams();
    if (params.date) query.append('date', params.date);
    if (params.userId) query.append('userId', params.userId);
    if (params.teamId) query.append('teamId', params.teamId);

    const res = await fetch(`/api/gps/points?${query.toString()}`);
    if (!res.ok) throw new Error('Falha ao buscar pontos GPS');
    return await res.json();
  } catch (err) {
    console.error('Error fetching GPS points:', err);
    return [];
  }
}

export async function sendGpsTrack(points: GpsPoint | GpsPoint[]): Promise<{
  success: boolean;
  count: number;
  points: GpsPoint[];
}> {
  try {
    const res = await fetch('/api/gps/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(points),
    });
    if (!res.ok) throw new Error('Falha ao registrar coordenadas GPS');
    return await res.json();
  } catch (err) {
    console.error('Error sending GPS tracking point(s):', err);
    return { success: false, count: 0, points: [] };
  }
}

export async function fetchGpsTrajectory(params: {
  date: string;
  userId?: string;
  teamId?: string;
}): Promise<GpsDayTrajectory | null> {
  try {
    const query = new URLSearchParams({ date: params.date });
    if (params.userId) query.append('userId', params.userId);
    if (params.teamId) query.append('teamId', params.teamId);

    const res = await fetch(`/api/gps/trajectory?${query.toString()}`);
    if (!res.ok) throw new Error('Falha ao calcular trajetória real');
    return await res.json();
  } catch (err) {
    console.error('Error fetching trajectory:', err);
    return null;
  }
}

export async function fetchGpsLatest(): Promise<GpsLatestLocation[]> {
  try {
    const res = await fetch('/api/gps/latest');
    if (!res.ok) throw new Error('Falha ao buscar últimas posições');
    return await res.json();
  } catch (err) {
    console.error('Error fetching latest GPS points:', err);
    return [];
  }
}

export async function recordGpsPermissionAudit(payload: {
  userId: string;
  userName: string;
  action: 'GRANTED' | 'REVOKED' | 'CHECK';
  platform?: string;
  userAgent?: string;
}): Promise<{ success: boolean }> {
  try {
    const res = await fetch('/api/gps/permission-audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return { success: false };
    return await res.json();
  } catch {
    return { success: false };
  }
}

// ---------------- SERVICE PHOTOS & AUDIT API ----------------

export async function recordServicePhotosAudit(payload: {
  userId: string;
  userName: string;
  userRole: string;
  action: 'CONSULTA' | 'DOWNLOAD_FOTOS' | 'GERACAO_RELATORIO';
  details: string;
  teamConsulted?: string;
  dateConsulted?: string;
}): Promise<{ success: boolean }> {
  try {
    const res = await fetch('/api/service-photos/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return { success: false };
    return await res.json();
  } catch {
    return { success: false };
  }
}

export async function fetchServicePhotosApi(
  user: User,
  adminToken?: string,
  params?: Record<string, string>
): Promise<{ total: number; photos: any[] }> {
  try {
    const query = new URLSearchParams(params || {}).toString();
    const headers: Record<string, string> = {
      'x-user-id': user.id,
      'x-user-role': user.role,
    };
    if (adminToken) {
      headers['x-admin-token'] = adminToken;
    }

    const res = await fetch(`/api/service-photos${query ? `?${query}` : ''}`, {
      headers,
    });
    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.warn('API error fetching service photos, using local state extract:', err);
    return { total: 0, photos: [] };
  }
}



