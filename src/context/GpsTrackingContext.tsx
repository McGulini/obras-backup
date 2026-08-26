import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { GpsPoint, GpsTrackingStatus } from '../types';
import { sendGpsTrack, recordGpsPermissionAudit } from '../services/api';
import {
  queueOfflineGpsPoint,
  getOfflineGpsQueue,
  clearOfflineGpsQueue,
  calculateHaversineDistanceKm,
} from '../services/gpsUtils';

const STORAGE_KEY_GPS_PERMISSION = 'obras_gps_permission_status_v1';
const STORAGE_KEY_GPS_PROMPT_SEEN = 'obras_gps_initial_prompt_seen_v1';

interface GpsTrackingContextType {
  trackingStatus: GpsTrackingStatus;
  isTrackingActive: boolean;
  permissionGranted: boolean;
  isPermissionModalOpen: boolean;
  isMobileArchitectureModalOpen: boolean;
  lastPoint: GpsPoint | null;
  lastRecordedTime: string | null;
  interruptedReason: string | null;
  accuracy: number | null;
  speed: number | null;
  heading: number | null;
  batteryLevel: number | null;
  offlinePointsCount: number;
  totalSessionPointsSent: number;
  requestTrackingPermission: () => Promise<boolean>;
  revokeTrackingPermission: (reason?: string) => Promise<void>;
  startTracking: () => Promise<void>;
  stopTracking: (reason?: string) => void;
  syncOfflineQueueNow: () => Promise<{ success: boolean; count: number }>;
  openPermissionModal: () => void;
  closePermissionModal: () => void;
  openMobileArchitectureModal: () => void;
  closeMobileArchitectureModal: () => void;
}

const GpsTrackingContext = createContext<GpsTrackingContextType | undefined>(undefined);

export const GpsTrackingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, isLeader } = useAuth();

  const [trackingStatus, setTrackingStatus] = useState<GpsTrackingStatus>('DISABLED');
  const [permissionGranted, setPermissionGranted] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_GPS_PERMISSION) === 'GRANTED';
    } catch {
      return false;
    }
  });

  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState<boolean>(false);
  const [isMobileArchitectureModalOpen, setIsMobileArchitectureModalOpen] = useState<boolean>(false);

  const [lastPoint, setLastPoint] = useState<GpsPoint | null>(null);
  const [lastRecordedTime, setLastRecordedTime] = useState<string | null>(null);
  const [interruptedReason, setInterruptedReason] = useState<string | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [speed, setSpeed] = useState<number | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [offlinePointsCount, setOfflinePointsCount] = useState<number>(0);
  const [totalSessionPointsSent, setTotalSessionPointsSent] = useState<number>(0);

  // References for continuous tracking
  const watchIdRef = useRef<number | null>(null);
  const wakeLockRef = useRef<any>(null);
  const lastDispatchedPointRef = useRef<GpsPoint | null>(null);
  const lastHeartbeatTimeRef = useRef<number>(Date.now());

  // Update offline queue count
  const refreshOfflineCount = useCallback(() => {
    try {
      setOfflinePointsCount(getOfflineGpsQueue().length);
    } catch {
      setOfflinePointsCount(0);
    }
  }, []);

  // Check battery status when available
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        setBatteryLevel(Math.round(battery.level * 100));
        battery.addEventListener('levelchange', () => {
          setBatteryLevel(Math.round(battery.level * 100));
        });
      }).catch(() => {});
    }
  }, []);

  // Request WakeLock to avoid deep sleep on screen lock when tracking
  const requestWakeLock = useCallback(async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      }
    } catch {
      // Wake Lock may fail on some browsers if tab is not focused, gracefully ignore
    }
  }, []);

  const releaseWakeLock = useCallback(() => {
    if (wakeLockRef.current) {
      try {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
      } catch {}
    }
  }, []);

  // Core function to process and send or queue a real GPS point
  const handleNewGeolocationPosition = useCallback(
    async (position: GeolocationPosition) => {
      if (!currentUser) return;

      const { latitude, longitude, accuracy: rawAccuracy, speed: rawSpeed, heading: rawHeading, altitude } = position.coords;
      const timestamp = new Date(position.timestamp).toISOString();
      const dateObj = new Date(position.timestamp);
      const dateStr = dateObj.toISOString().split('T')[0];
      const timeFormatted = dateObj.toLocaleTimeString('pt-BR', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      const shortTime = timeFormatted.substring(0, 5);

      // Speed in km/h if available
      const speedKmH = rawSpeed !== null && rawSpeed !== undefined && rawSpeed >= 0
        ? Number((rawSpeed * 3.6).toFixed(1))
        : 0;

      setAccuracy(rawAccuracy ? Number(rawAccuracy.toFixed(1)) : null);
      setSpeed(speedKmH);
      setHeading(rawHeading ?? null);
      setLastRecordedTime(shortTime);
      setTrackingStatus('ACTIVE');
      setInterruptedReason(null);

      // Intelligent Battery-Savvy Delta Filter:
      // If the leader is stationary (distance < 12 meters & speed < 2 km/h)
      // don't flood with 1 point every 2s, BUT send a stay heartbeat every 3 minutes
      // so duration at worksite / stop (e.g. 1h00min) is recorded accurately!
      const last = lastDispatchedPointRef.current;
      const now = Date.now();
      const elapsedSinceLastHeartbeatMs = now - lastHeartbeatTimeRef.current;

      if (last) {
        const deltaMeters = calculateHaversineDistanceKm(last.latitude, last.longitude, latitude, longitude) * 1000;
        const isStationary = deltaMeters < 15 && speedKmH < 3;
        const isHeartbeatDue = elapsedSinceLastHeartbeatMs >= 180000; // 3 minutes for stay dwell

        if (isStationary && !isHeartbeatDue) {
          // Skip redundant point, preserve battery
          return;
        }
      }

      lastHeartbeatTimeRef.current = now;

      const newPoint: GpsPoint = {
        id: `gps-live-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        teamId: currentUser.teamId || 'team-field',
        teamName: `Equipe ${currentUser.name}`,
        date: dateStr,
        timestamp,
        timeFormatted,
        latitude,
        longitude,
        accuracy: rawAccuracy ? Number(rawAccuracy.toFixed(1)) : 5.0,
        speed: speedKmH,
        heading: rawHeading ?? null,
        altitude: altitude ?? null,
        pointType: lastDispatchedPointRef.current === null ? 'START' : 'INTERMEDIATE',
        batteryLevel: batteryLevel ?? undefined,
        source: 'DEVICE_GPS',
        synced: true,
      };

      setLastPoint(newPoint);
      lastDispatchedPointRef.current = newPoint;

      // Online vs Offline Dispatching
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        queueOfflineGpsPoint(newPoint);
        refreshOfflineCount();
      } else {
        try {
          const res = await sendGpsTrack(newPoint);
          if (res.success) {
            setTotalSessionPointsSent((prev) => prev + 1);
          } else {
            queueOfflineGpsPoint(newPoint);
            refreshOfflineCount();
          }
        } catch {
          queueOfflineGpsPoint(newPoint);
          refreshOfflineCount();
        }
      }
    },
    [currentUser, batteryLevel, refreshOfflineCount]
  );

  // Geolocation error handler
  const handleGeolocationError = useCallback((error: GeolocationPositionError) => {
    setTrackingStatus('INTERRUPTED');
    switch (error.code) {
      case error.PERMISSION_DENIED:
        setInterruptedReason('Permissão de localização revogada pelo usuário ou bloqueada no navegador.');
        setPermissionGranted(false);
        try {
          localStorage.setItem(STORAGE_KEY_GPS_PERMISSION, 'DENIED');
        } catch {}
        break;
      case error.POSITION_UNAVAILABLE:
        setInterruptedReason('Sinal GPS indisponível no momento. O aparelho está buscando satélites...');
        break;
      case error.TIMEOUT:
        setInterruptedReason('Tempo limite de resposta do sensor GPS excedido. Tentando reconectar...');
        break;
      default:
        setInterruptedReason('Rastreamento temporariamente interrompido pelo sistema operacional.');
    }
  }, []);

  // Stop tracking
  const stopTracking = useCallback((reason?: string) => {
    if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    releaseWakeLock();
    setTrackingStatus('DISABLED');
    if (reason) {
      setInterruptedReason(reason);
    }
  }, [releaseWakeLock]);

  // Start continuous tracking
  const startTracking = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setTrackingStatus('INTERRUPTED');
      setInterruptedReason('Geolocalização por GPS não suportada neste aparelho/navegador.');
      return;
    }

    // Clear existing watch if any
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    setTrackingStatus('ACTIVE');
    setInterruptedReason(null);
    requestWakeLock();

    // High accuracy continuous watch
    const id = navigator.geolocation.watchPosition(
      handleNewGeolocationPosition,
      handleGeolocationError,
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0,
      }
    );

    watchIdRef.current = id;
  }, [handleNewGeolocationPosition, handleGeolocationError, requestWakeLock]);

  // Request Tracking Permission Flow
  const requestTrackingPermission = useCallback(async (): Promise<boolean> => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setTrackingStatus('INTERRUPTED');
      setInterruptedReason('Sensor GPS indisponível neste dispositivo.');
      return false;
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          setPermissionGranted(true);
          try {
            localStorage.setItem(STORAGE_KEY_GPS_PERMISSION, 'GRANTED');
            localStorage.setItem(STORAGE_KEY_GPS_PROMPT_SEEN, 'true');
          } catch {}

          setIsPermissionModalOpen(false);

          if (currentUser) {
            recordGpsPermissionAudit({
              userId: currentUser.id,
              userName: currentUser.name,
              action: 'GRANTED',
              platform: navigator.userAgent,
            });
          }

          // Immediately process initial fix
          handleNewGeolocationPosition(position);
          startTracking();
          resolve(true);
        },
        (error) => {
          setPermissionGranted(false);
          try {
            localStorage.setItem(STORAGE_KEY_GPS_PERMISSION, 'DENIED');
            localStorage.setItem(STORAGE_KEY_GPS_PROMPT_SEEN, 'true');
          } catch {}

          handleGeolocationError(error);

          if (currentUser) {
            recordGpsPermissionAudit({
              userId: currentUser.id,
              userName: currentUser.name,
              action: 'REVOKED',
              platform: navigator.userAgent,
            });
          }
          resolve(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        }
      );
    });
  }, [currentUser, handleNewGeolocationPosition, handleGeolocationError, startTracking]);

  // Revoke permission
  const revokeTrackingPermission = useCallback(async (reason = 'Revogado pelo Chefe de Equipe') => {
    stopTracking(reason);
    setPermissionGranted(false);
    setTrackingStatus('DISABLED');
    setInterruptedReason('Rastreamento interrompido: Permissão desativada pelo usuário.');
    try {
      localStorage.setItem(STORAGE_KEY_GPS_PERMISSION, 'DENIED');
    } catch {}

    if (currentUser) {
      recordGpsPermissionAudit({
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'REVOKED',
        platform: navigator.userAgent,
      });
    }
  }, [currentUser, stopTracking]);

  // Sync offline queue
  const syncOfflineQueueNow = useCallback(async (): Promise<{ success: boolean; count: number }> => {
    const queue = getOfflineGpsQueue();
    if (queue.length === 0) return { success: true, count: 0 };

    try {
      const res = await sendGpsTrack(queue);
      if (res.success) {
        clearOfflineGpsQueue();
        refreshOfflineCount();
        return { success: true, count: queue.length };
      }
      return { success: false, count: 0 };
    } catch {
      return { success: false, count: 0 };
    }
  }, [refreshOfflineCount]);

  // Listen for online events to auto-sync GPS breadcrumbs
  useEffect(() => {
    const handleOnline = () => {
      syncOfflineQueueNow();
    };

    window.addEventListener('online', handleOnline);
    refreshOfflineCount();

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [syncOfflineQueueNow, refreshOfflineCount]);

  // Listen for Page Visibility changes: ensure tracking continues even if minimized or screen locked
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Reacquire screen wakeLock if was released
        if (trackingStatus === 'ACTIVE') {
          requestWakeLock();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [trackingStatus, requestWakeLock]);

  // Initial Startup check for Field Leaders (Chefes de Equipe)
  useEffect(() => {
    if (!currentUser || !isLeader) {
      stopTracking();
      return;
    }

    const hasSeenPrompt = localStorage.getItem(STORAGE_KEY_GPS_PROMPT_SEEN) === 'true';
    const isGranted = localStorage.getItem(STORAGE_KEY_GPS_PERMISSION) === 'GRANTED';

    if (isGranted) {
      // Auto resume tracking for field leader without nagging
      startTracking();
    } else if (!hasSeenPrompt) {
      // First use: prompt with clear authorization modal
      setIsPermissionModalOpen(true);
    } else {
      setTrackingStatus('DISABLED');
      setInterruptedReason('Rastreamento não autorizado. Clique para ativar.');
    }

    return () => {
      stopTracking();
    };
  }, [currentUser?.id, isLeader]);

  const value: GpsTrackingContextType = {
    trackingStatus,
    isTrackingActive: trackingStatus === 'ACTIVE',
    permissionGranted,
    isPermissionModalOpen,
    isMobileArchitectureModalOpen,
    lastPoint,
    lastRecordedTime,
    interruptedReason,
    accuracy,
    speed,
    heading,
    batteryLevel,
    offlinePointsCount,
    totalSessionPointsSent,
    requestTrackingPermission,
    revokeTrackingPermission,
    startTracking,
    stopTracking,
    syncOfflineQueueNow,
    openPermissionModal: () => setIsPermissionModalOpen(true),
    closePermissionModal: () => setIsPermissionModalOpen(false),
    openMobileArchitectureModal: () => setIsMobileArchitectureModalOpen(true),
    closeMobileArchitectureModal: () => setIsMobileArchitectureModalOpen(false),
  };

  return <GpsTrackingContext.Provider value={value}>{children}</GpsTrackingContext.Provider>;
};

export const useGpsTracking = () => {
  const context = useContext(GpsTrackingContext);
  if (!context) {
    throw new Error('useGpsTracking must be used within a GpsTrackingProvider');
  }
  return context;
};
