import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Team,
  Helper,
  Worksite,
  DailyLog,
  Occurrence,
  AuditLog,
  OccurrenceStatus,
  User,
  Appointment,
  AppointmentStatus,
  AppointmentConflict,
} from '../types';
import {
  fetchBootstrapData,
  saveDailyLog,
  updateOccurrenceStatus,
  createTeam,
  updateTeam,
  createWorksite,
  updateWorksite,
  createHelper,
  updateHelper,
  deleteHelper,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  updateAppointmentStatus,
  syncOfflineLogs,
  getOfflineQueue,
  resetDemoData,
} from '../services/api';
import {
  INITIAL_TEAMS,
  INITIAL_HELPERS,
  INITIAL_WORKSITES,
  INITIAL_DAILY_LOGS,
  INITIAL_AUDIT_LOGS,
  INITIAL_APPOINTMENTS,
} from '../data/mockData';
import { useAuth } from './AuthContext';

interface DataContextType {
  teams: Team[];
  helpers: Helper[];
  worksites: Worksite[];
  dailyLogs: DailyLog[];
  occurrences: Occurrence[];
  auditLogs: AuditLog[];
  appointments: Appointment[];
  offlineQueue: DailyLog[];
  pendingOfflineCount: number;
  isOnline: boolean;
  isLoading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  addDailyLog: (log: Partial<DailyLog>) => Promise<DailyLog>;
  updateDailyLog: (id: string, log: Partial<DailyLog>) => Promise<DailyLog>;
  changeOccurrenceStatus: (
    occurrenceId: string,
    status: OccurrenceStatus,
    adminObservation?: string,
    assignedAdminName?: string
  ) => Promise<void>;
  addTeam: (team: Partial<Team>) => Promise<Team>;
  editTeam: (id: string, team: Partial<Team>) => Promise<Team>;
  addWorksite: (worksite: Partial<Worksite>) => Promise<Worksite>;
  editWorksite: (id: string, worksite: Partial<Worksite>) => Promise<Worksite>;
  addHelper: (helper: Partial<Helper>) => Promise<Helper>;
  editHelper: (id: string, helper: Partial<Helper>) => Promise<Helper>;
  removeHelper: (id: string) => Promise<void>;
  toggleHelperActive: (id: string, active: boolean) => Promise<Helper>;
  addAppointment: (appointment: Partial<Appointment>, forceOverride?: boolean) => Promise<Appointment>;
  editAppointment: (id: string, appointment: Partial<Appointment>, forceOverride?: boolean) => Promise<Appointment>;
  removeAppointment: (id: string) => Promise<void>;
  changeAppointmentStatus: (id: string, status: AppointmentStatus) => Promise<Appointment>;
  checkConflicts: (appointment: Partial<Appointment>, excludeId?: string) => AppointmentConflict[];
  syncOffline: () => Promise<{ count: number }>;
  triggerOfflineSync: () => Promise<{ count: number }>;
  resetAllDataToDemo: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, setAllUsers } = useAuth();
  const [teams, setTeams] = useState<Team[]>(INITIAL_TEAMS || []);
  const [helpers, setHelpers] = useState<Helper[]>(INITIAL_HELPERS || []);
  const [worksites, setWorksites] = useState<Worksite[]>(INITIAL_WORKSITES || []);
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>(INITIAL_DAILY_LOGS || []);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_AUDIT_LOGS || []);
  const [appointments, setAppointments] = useState<Appointment[]>(INITIAL_APPOINTMENTS || []);
  const [offlineQueue, setOfflineQueue] = useState<DailyLog[]>(() => {
    try {
      return getOfflineQueue() || [];
    } catch {
      return [];
    }
  });
  const [pendingOfflineCount, setPendingOfflineCount] = useState<number>(0);
  const [isOnline, setIsOnline] = useState<boolean>(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const updateOfflineCount = useCallback(() => {
    try {
      const queue = getOfflineQueue() || [];
      setOfflineQueue(queue);
      setPendingOfflineCount(queue.length);
    } catch {
      setOfflineQueue([]);
      setPendingOfflineCount(0);
    }
  }, []);

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Auto sync when coming back online
      triggerOfflineSync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    updateOfflineCount();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [updateOfflineCount]);

  const refreshData = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchBootstrapData();
      if (data) {
        if (data.users && data.users.length > 0) {
          setAllUsers(data.users);
        }
        setTeams(data.teams || INITIAL_TEAMS || []);
        setHelpers(data.helpers || INITIAL_HELPERS || []);
        setWorksites(data.worksites || INITIAL_WORKSITES || []);
        setDailyLogs(data.dailyLogs || INITIAL_DAILY_LOGS || []);
        setAuditLogs(data.auditLogs || INITIAL_AUDIT_LOGS || []);
        setAppointments(data.appointments || INITIAL_APPOINTMENTS || []);
      }
      updateOfflineCount();
    } catch (err: any) {
      console.warn('Failed to refresh data, preserving current state:', err);
    } finally {
      setIsLoading(false);
    }
  }, [updateOfflineCount, setAllUsers]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Extract all occurrences from daily logs
  const occurrences: Occurrence[] = (dailyLogs || [])
    .filter((log) => log && log.hasOccurrence && log.occurrence)
    .map((log) => log.occurrence as Occurrence)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Add Daily Log
  const addDailyLog = async (logData: Partial<DailyLog>): Promise<DailyLog> => {
    try {
      const saved = await saveDailyLog(logData, currentUser);
      setDailyLogs((prev) => {
        const existingIdx = (prev || []).findIndex((l) => l.id === saved.id);
        if (existingIdx >= 0) {
          const updated = [...(prev || [])];
          updated[existingIdx] = saved;
          return updated;
        }
        return [saved, ...(prev || [])];
      });
      updateOfflineCount();
      return saved;
    } catch (err: any) {
      console.error(err);
      throw err;
    }
  };

  // Update Daily Log
  const updateDailyLog = async (id: string, logData: Partial<DailyLog>): Promise<DailyLog> => {
    try {
      const saved = await saveDailyLog({ ...logData, id }, currentUser);
      setDailyLogs((prev) => (prev || []).map((l) => (l.id === id ? saved : l)));
      updateOfflineCount();
      return saved;
    } catch (err: any) {
      console.error(err);
      throw err;
    }
  };

  // Change occurrence status
  const changeOccurrenceStatus = async (
    occurrenceId: string,
    status: OccurrenceStatus,
    adminObservation?: string,
    assignedAdminName?: string
  ) => {
    try {
      const updatedOcc = await updateOccurrenceStatus(occurrenceId, {
        status,
        adminObservation,
        assignedAdminName,
        user: currentUser,
      });

      // Update in state
      setDailyLogs((prev) =>
        (prev || []).map((log) => {
          if (log.occurrence && log.occurrence.id === occurrenceId) {
            return {
              ...log,
              occurrence: {
                ...log.occurrence,
                ...updatedOcc,
              },
            };
          }
          return log;
        })
      );

      // Refresh to get new audit logs
      refreshData();
    } catch (err: any) {
      console.error(err);
      throw err;
    }
  };

  // Team actions
  const addTeam = async (teamData: Partial<Team>): Promise<Team> => {
    const created = await createTeam(teamData, currentUser);
    setTeams((prev) => [...(prev || []), created]);
    refreshData();
    return created;
  };

  const editTeam = async (id: string, teamData: Partial<Team>): Promise<Team> => {
    const updated = await updateTeam(id, teamData, currentUser);
    setTeams((prev) => (prev || []).map((t) => (t.id === id ? updated : t)));
    refreshData();
    return updated;
  };

  // Worksite actions
  const addWorksite = async (worksiteData: Partial<Worksite>): Promise<Worksite> => {
    const created = await createWorksite(worksiteData, currentUser);
    setWorksites((prev) => [...(prev || []), created]);
    refreshData();
    return created;
  };

  const editWorksite = async (id: string, worksiteData: Partial<Worksite>): Promise<Worksite> => {
    const updated = await updateWorksite(id, worksiteData, currentUser);
    setWorksites((prev) => (prev || []).map((w) => (w.id === id ? updated : w)));
    refreshData();
    return updated;
  };

  // Helper actions
  const addHelper = async (helperData: Partial<Helper>): Promise<Helper> => {
    const created = await createHelper(helperData, currentUser);
    setHelpers((prev) => [...(prev || []), created]);
    refreshData();
    return created;
  };

  const editHelper = async (id: string, helperData: Partial<Helper>): Promise<Helper> => {
    const updated = await updateHelper(id, helperData, currentUser);
    setHelpers((prev) => (prev || []).map((h) => (h.id === id ? updated : h)));
    refreshData();
    return updated;
  };

  const removeHelper = async (id: string): Promise<void> => {
    await deleteHelper(id, currentUser);
    setHelpers((prev) => (prev || []).filter((h) => h.id !== id));
    refreshData();
  };

  const toggleHelperActive = async (id: string, active: boolean): Promise<Helper> => {
    const updated = await updateHelper(id, { active }, currentUser);
    setHelpers((prev) => (prev || []).map((h) => (h.id === id ? updated : h)));
    refreshData();
    return updated;
  };

  // Appointment actions
  const addAppointment = async (
    appointmentData: Partial<Appointment>,
    forceOverride?: boolean
  ): Promise<Appointment> => {
    const created = await createAppointment(appointmentData, currentUser, forceOverride);
    setAppointments((prev) => [...(prev || []), created]);
    refreshData();
    return created;
  };

  const editAppointment = async (
    id: string,
    appointmentData: Partial<Appointment>,
    forceOverride?: boolean
  ): Promise<Appointment> => {
    const updated = await updateAppointment(id, appointmentData, currentUser, forceOverride);
    setAppointments((prev) => (prev || []).map((a) => (a.id === id ? updated : a)));
    refreshData();
    return updated;
  };

  const removeAppointment = async (id: string): Promise<void> => {
    await deleteAppointment(id, currentUser);
    setAppointments((prev) => (prev || []).filter((a) => a.id !== id));
    refreshData();
  };

  const changeAppointmentStatus = async (
    id: string,
    status: AppointmentStatus
  ): Promise<Appointment> => {
    const updated = await updateAppointmentStatus(id, status, currentUser);
    setAppointments((prev) => (prev || []).map((a) => (a.id === id ? updated : a)));
    refreshData();
    return updated;
  };

  // Check conflicts helper
  const checkConflicts = (
    appointment: Partial<Appointment>,
    excludeId?: string
  ): AppointmentConflict[] => {
    const conflicts: AppointmentConflict[] = [];
    if (!appointment.startDate || !appointment.endDate) return conflicts;

    const start = appointment.startDate;
    const end = appointment.endDate;

    const activeList = (appointments || []).filter(
      (a) => a.id !== excludeId && a.status !== 'CANCELADO'
    );

    // Overlap condition: start <= a.endDate && end >= a.startDate
    const overlapping = activeList.filter((a) => start <= a.endDate && end >= a.startDate);

    // 1. Check Helper conflicts
    if (appointment.helperIds && appointment.helperIds.length > 0) {
      appointment.helperIds.forEach((helperId) => {
        const conflictingApp = overlapping.find(
          (a) => a.teamId !== appointment.teamId && (a.helperIds || []).includes(helperId)
        );
        if (conflictingApp) {
          const helperObj = (helpers || []).find((h) => h.id === helperId);
          const helperName = helperObj ? helperObj.name : 'Ajudante';
          conflicts.push({
            type: 'HELPER',
            severity: 'CRITICAL',
            title: `Conflito de Ajudante: ${helperName}`,
            description: `${helperName} já está escalado(a) na "${conflictingApp.teamName}" em ${conflictingApp.city} de ${conflictingApp.startDate.split('-').reverse().join('/')} a ${conflictingApp.endDate.split('-').reverse().join('/')}.`,
            conflictingAppointmentId: conflictingApp.id,
            conflictingTeamName: conflictingApp.teamName,
            conflictingDates: `${conflictingApp.startDate} a ${conflictingApp.endDate}`,
            helperName,
          });
        }
      });
    }

    // 2. Check Team conflict (same team in overlapping dates)
    if (appointment.teamId) {
      const conflictingTeamApp = overlapping.find(
        (a) => a.teamId === appointment.teamId && a.id !== excludeId
      );
      if (conflictingTeamApp) {
        conflicts.push({
          type: 'TEAM',
          severity: 'CRITICAL',
          title: `Conflito de Equipe: ${appointment.teamName || 'Esta Equipe'}`,
          description: `A equipe já possui outro agendamento programado para "${conflictingTeamApp.worksiteName}" (${conflictingTeamApp.city}) entre ${conflictingTeamApp.startDate.split('-').reverse().join('/')} e ${conflictingTeamApp.endDate.split('-').reverse().join('/')}.`,
          conflictingAppointmentId: conflictingTeamApp.id,
          conflictingTeamName: conflictingTeamApp.teamName,
          conflictingDates: `${conflictingTeamApp.startDate} a ${conflictingTeamApp.endDate}`,
        });
      }
    }

    // 3. Worksite conflict warning
    if (appointment.worksiteId) {
      const sameWorksiteApp = overlapping.find(
        (a) => a.worksiteId === appointment.worksiteId && a.teamId !== appointment.teamId
      );
      if (sameWorksiteApp) {
        conflicts.push({
          type: 'WORKSITE',
          severity: 'WARNING',
          title: `Aviso de Obra: Obra com Múltiplas Equipes`,
          description: `A obra "${sameWorksiteApp.worksiteName}" também contará com a "${sameWorksiteApp.teamName}" durante o mesmo período (${sameWorksiteApp.startDate.split('-').reverse().join('/')} a ${sameWorksiteApp.endDate.split('-').reverse().join('/')}).`,
          conflictingAppointmentId: sameWorksiteApp.id,
          conflictingTeamName: sameWorksiteApp.teamName,
          conflictingDates: `${sameWorksiteApp.startDate} a ${sameWorksiteApp.endDate}`,
        });
      }
    }

    return conflicts;
  };

  // Offline sync trigger
  const triggerOfflineSync = async (): Promise<{ count: number }> => {
    try {
      const res = await syncOfflineLogs(currentUser);
      updateOfflineCount();
      if (res.count > 0) {
        refreshData();
      }
      return { count: res.count };
    } catch (err) {
      console.error('Erro na sincronização:', err);
      return { count: 0 };
    }
  };

  // Alias for syncOffline
  const syncOffline = triggerOfflineSync;

  // Reset demo
  const resetAllDataToDemo = async () => {
    await resetDemoData();
    await refreshData();
  };

  return (
    <DataContext.Provider
      value={{
        teams: teams || [],
        helpers: helpers || [],
        worksites: worksites || [],
        dailyLogs: dailyLogs || [],
        occurrences: occurrences || [],
        auditLogs: auditLogs || [],
        appointments: appointments || [],
        offlineQueue: offlineQueue || [],
        pendingOfflineCount: pendingOfflineCount || 0,
        isOnline: Boolean(isOnline),
        isLoading: Boolean(isLoading),
        error,
        refreshData,
        addDailyLog,
        updateDailyLog,
        changeOccurrenceStatus,
        addTeam,
        editTeam,
        addWorksite,
        editWorksite,
        addHelper,
        editHelper,
        removeHelper,
        toggleHelperActive,
        addAppointment,
        editAppointment,
        removeAppointment,
        changeAppointmentStatus,
        checkConflicts,
        syncOffline,
        triggerOfflineSync,
        resetAllDataToDemo,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within a DataProvider');
  return context;
};
