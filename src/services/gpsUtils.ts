import { GpsPoint, GpsDayTrajectory, VisitedWorksiteStop, TrajectoryStop, Worksite } from '../types';

/**
 * Calculates the great-circle distance between two geographic coordinates
 * using the Haversine formula (Real geodesic distance, STRICTLY NO routing / navigation).
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculates the total actual distance traveled by summing the direct geodesic
 * segments between consecutive recorded GPS points in chronological order:
 * P1 -> P2 + P2 -> P3 + P3 -> P4 ...
 * STRICTLY no artificial routing or navigation paths.
 */
export function calculateTotalTrajectoryDistanceKm(points: GpsPoint[]): number {
  if (!points || points.length < 2) return 0;
  let totalKm = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    if (
      p1 &&
      p2 &&
      typeof p1.latitude === 'number' &&
      typeof p1.longitude === 'number' &&
      typeof p2.latitude === 'number' &&
      typeof p2.longitude === 'number'
    ) {
      const dist = calculateHaversineDistanceKm(p1.latitude, p1.longitude, p2.latitude, p2.longitude);
      // Filter out invalid sensor teleportation spikes (> 100km single leap)
      if (dist < 100) {
        totalKm += dist;
      }
    }
  }
  return Number(totalKm.toFixed(2));
}

/**
 * Formats coordinates for clean, professional display.
 */
export function formatCoordinates(lat: number, lon: number, highPrecision = false): string {
  if (typeof lat !== 'number' || typeof lon !== 'number') return 'Coordenadas indisponíveis';
  const decimals = highPrecision ? 6 : 5;
  return `${lat.toFixed(decimals)}, ${lon.toFixed(decimals)}`;
}

/**
 * Formats duration in minutes into clear human string (e.g. "1h00min", "45 min", "1h30min")
 */
export function formatDurationMinutes(minutes: number): string {
  if (!minutes || minutes <= 0) return '0 min';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}h${mins.toString().padStart(2, '0')}min`;
  }
  return `${mins} min`;
}

export interface TrajectoryTimelineEvent {
  id: string;
  type: 'DEPARTURE' | 'TRAVEL' | 'ARRIVAL' | 'STAY' | 'DEPARTURE_STOP' | 'RETURN_TRAVEL' | 'RETURN_BASE';
  time: string;
  endTime?: string;
  durationFormatted?: string;
  title: string;
  description: string;
  worksiteName?: string;
  isWorksite?: boolean;
  distanceKm?: number;
  latitude?: number;
  longitude?: number;
}

/**
 * Analyzes raw chronological GPS breadcrumbs into structured day trajectory:
 * - Detects start point, end point
 * - Detects stops according to configurable minimum threshold (default 15 minutes)
 * - Identifies stops at registered worksites ("Parada na obra") vs general locations ("Parada identificada")
 * - Formats durations (e.g. "1h00min")
 * - Builds automatic chronological timeline
 */
export function buildDayTrajectoryFromPoints(
  rawPoints: GpsPoint[],
  date: string,
  userId: string,
  userName: string,
  teamId: string,
  teamName: string,
  knownWorksites: Worksite[] = [],
  minStopMinutes: number = 15
): GpsDayTrajectory & { timelineEvents: TrajectoryTimelineEvent[] } {
  // Sort strictly chronologically by ISO timestamp
  const points = [...(rawPoints || [])].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const totalPoints = points.length;
  const hasEnoughData = totalPoints >= 2;
  const totalDistanceKm = calculateTotalTrajectoryDistanceKm(points);

  const startTime = points.length > 0 ? points[0].timeFormatted : undefined;
  const endTime = points.length > 0 ? points[points.length - 1].timeFormatted : undefined;

  let totalDurationFormatted = '0h 00m';
  if (points.length >= 2) {
    const t0 = new Date(points[0].timestamp).getTime();
    const t1 = new Date(points[points.length - 1].timestamp).getTime();
    const diffMs = Math.max(0, t1 - t0);
    const hours = Math.floor(diffMs / 3600000);
    const minutes = Math.floor((diffMs % 3600000) / 60000);
    totalDurationFormatted = `${hours}h ${minutes.toString().padStart(2, '0')}m`;
  }

  // Detect stops (periods of >= minStopMinutes with low displacement < 80 meters)
  const stops: TrajectoryStop[] = [];
  const visitedWorksites: VisitedWorksiteStop[] = [];
  const timelineEvents: TrajectoryTimelineEvent[] = [];

  // 1. Initial Departure Event
  if (points.length > 0) {
    const firstPoint = points[0];
    timelineEvents.push({
      id: `timeline-start-${firstPoint.id}`,
      type: 'DEPARTURE',
      time: firstPoint.timeFormatted,
      title: `Saída da Base / Início da Jornada`,
      description: firstPoint.addressReference || 'Início do deslocamento registrado pelo GPS do aparelho',
      latitude: firstPoint.latitude,
      longitude: firstPoint.longitude,
    });
  }

  if (points.length > 0) {
    let currentCluster: GpsPoint[] = [points[0]];
    let clusterStartIndex = 0;
    let lastProcessedIndex = 0;

    for (let i = 1; i < points.length; i++) {
      const p = points[i];
      const anchor = currentCluster[0];
      const distMeters = calculateHaversineDistanceKm(anchor.latitude, anchor.longitude, p.latitude, p.longitude) * 1000;

      if (distMeters < 80) {
        currentCluster.push(p);
      } else {
        // Evaluate previous cluster
        if (currentCluster.length >= 2) {
          const tStart = new Date(currentCluster[0].timestamp).getTime();
          const tEnd = new Date(currentCluster[currentCluster.length - 1].timestamp).getTime();
          const durationMin = Math.round((tEnd - tStart) / 60000);

          // Only consider a stationary stop if duration >= configured minStopMinutes (default 15 min)
          // or explicitly tagged as WORKSITE or STOP by the field team
          const hasExplicitTag = currentCluster.some(
            (c) => c.pointType === 'WORKSITE' || c.pointType === 'STOP' || (c.stopDurationMinutes && c.stopDurationMinutes >= minStopMinutes)
          );

          if (durationMin >= minStopMinutes || hasExplicitTag) {
            const avgLat = currentCluster.reduce((sum, item) => sum + item.latitude, 0) / currentCluster.length;
            const avgLon = currentCluster.reduce((sum, item) => sum + item.longitude, 0) / currentCluster.length;

            // Check if near any registered worksite (< 250m) or tagged by name
            const matchingWorksite = knownWorksites.find((w) => {
              if (w.latitude && w.longitude) {
                const dWs = calculateHaversineDistanceKm(avgLat, avgLon, w.latitude, w.longitude) * 1000;
                if (dWs <= 300) return true;
              }
              const hasWorksiteTag = currentCluster.some(
                (c) => c.worksiteName && c.worksiteName.toLowerCase() === w.name.toLowerCase()
              );
              return hasWorksiteTag;
            }) || (currentCluster.find((c) => c.worksiteName) ? {
              name: currentCluster.find((c) => c.worksiteName)!.worksiteName!,
              id: currentCluster.find((c) => c.worksiteId)?.worksiteId || 'ws-temp',
              city: 'Curitiba/RMC',
            } : null);

            const isWorksite = Boolean(matchingWorksite || currentCluster.some((c) => c.worksiteName || c.pointType === 'WORKSITE'));
            const wsName = matchingWorksite?.name || currentCluster.find((c) => c.worksiteName)?.worksiteName || 'Local de Atividade';
            const effectiveDuration = durationMin > 0 ? durationMin : (currentCluster[0].stopDurationMinutes || minStopMinutes);
            const durationLabel = formatDurationMinutes(effectiveDuration);

            const stopAddress = currentCluster.find((c) => c.addressReference)?.addressReference;
            const stopNotes = currentCluster.find((c) => c.notes)?.notes;

            // Calculate travel distance from last landmark
            const travelSegmentPoints = points.slice(lastProcessedIndex, clusterStartIndex + 1);
            const segmentDistKm = calculateTotalTrajectoryDistanceKm(travelSegmentPoints);

            if (segmentDistKm > 0.1 && clusterStartIndex > 0) {
              timelineEvents.push({
                id: `travel-${i}`,
                type: 'TRAVEL',
                time: points[lastProcessedIndex].timeFormatted,
                endTime: currentCluster[0].timeFormatted,
                title: `Deslocamento Real`,
                description: `Trajeto real de ${segmentDistKm.toFixed(1)} km registrado pelo sensor GPS`,
                distanceKm: segmentDistKm,
              });
            }

            // Arrival Event
            timelineEvents.push({
              id: `arrival-${i}`,
              type: 'ARRIVAL',
              time: currentCluster[0].timeFormatted,
              title: isWorksite ? `Chegada à Obra ${wsName}` : `Chegada ao local de parada`,
              description: stopAddress || (isWorksite ? `Canteiro de obras: ${wsName}` : 'Ponto de permanência identificado'),
              worksiteName: isWorksite ? wsName : undefined,
              isWorksite,
              latitude: avgLat,
              longitude: avgLon,
            });

            // Stay Event
            timelineEvents.push({
              id: `stay-${i}`,
              type: 'STAY',
              time: currentCluster[0].timeFormatted,
              endTime: currentCluster[currentCluster.length - 1].timeFormatted,
              durationFormatted: durationLabel,
              title: isWorksite ? `Permanência na obra` : `Parada no local — ${durationLabel}`,
              description: isWorksite
                ? `Permanência de aproximadamente ${durationLabel} na obra "${wsName}".`
                : `Aparelho permaneceu parado por ${durationLabel}.`,
              worksiteName: isWorksite ? wsName : undefined,
              isWorksite,
              latitude: avgLat,
              longitude: avgLon,
            });

            // Departure Event from Stop
            timelineEvents.push({
              id: `dep-stop-${i}`,
              type: 'DEPARTURE_STOP',
              time: currentCluster[currentCluster.length - 1].timeFormatted,
              title: isWorksite ? `Saída da obra ${wsName}` : `Saída do local de parada`,
              description: `Reinício do deslocamento registrado`,
              worksiteName: isWorksite ? wsName : undefined,
              isWorksite,
              latitude: avgLat,
              longitude: avgLon,
            });

            stops.push({
              id: `stop-${i}-${currentCluster[0].id}`,
              title: isWorksite ? `Parada na obra: ${wsName}` : `Parada identificada (${durationLabel})`,
              arrivedAt: currentCluster[0].timeFormatted,
              departedAt: currentCluster[currentCluster.length - 1].timeFormatted,
              startTime: currentCluster[0].timeFormatted,
              endTime: currentCluster[currentCluster.length - 1].timeFormatted,
              durationMinutes: effectiveDuration,
              latitude: avgLat,
              longitude: avgLon,
              isWorksite,
              worksiteName: isWorksite ? wsName : undefined,
              addressReference: stopAddress || (isWorksite ? wsName : undefined),
              notes: stopNotes,
            });

            if (isWorksite) {
              visitedWorksites.push({
                worksiteId: matchingWorksite?.id,
                worksiteName: wsName,
                city: matchingWorksite && 'city' in matchingWorksite ? (matchingWorksite as any).city : undefined,
                arrivedAt: currentCluster[0].timeFormatted,
                departedAt: currentCluster[currentCluster.length - 1].timeFormatted,
                arrivalTime: currentCluster[0].timeFormatted,
                departureTime: currentCluster[currentCluster.length - 1].timeFormatted,
                durationMinutes: effectiveDuration,
                latitude: avgLat,
                longitude: avgLon,
                pointsCount: currentCluster.length,
              });
            }

            lastProcessedIndex = i - 1;
          }
        }
        currentCluster = [p];
        clusterStartIndex = i;
      }
    }

    // Check last cluster at end of shift
    if (currentCluster.length >= 2) {
      const tStart = new Date(currentCluster[0].timestamp).getTime();
      const tEnd = new Date(currentCluster[currentCluster.length - 1].timestamp).getTime();
      const durationMin = Math.round((tEnd - tStart) / 60000);
      const hasExplicitTag = currentCluster.some((c) => c.pointType === 'WORKSITE' || c.pointType === 'STOP');

      if (durationMin >= minStopMinutes || hasExplicitTag) {
        const avgLat = currentCluster.reduce((sum, item) => sum + item.latitude, 0) / currentCluster.length;
        const avgLon = currentCluster.reduce((sum, item) => sum + item.longitude, 0) / currentCluster.length;
        const isWorksite = currentCluster.some((c) => c.worksiteName || c.pointType === 'WORKSITE');
        const wsName = currentCluster.find((c) => c.worksiteName)?.worksiteName || 'Última Parada';
        const effectiveDuration = durationMin > 0 ? durationMin : (currentCluster[0].stopDurationMinutes || minStopMinutes);
        const durationLabel = formatDurationMinutes(effectiveDuration);

        stops.push({
          id: `stop-last-${currentCluster[0].id}`,
          title: isWorksite ? `Parada na obra: ${wsName}` : `Parada identificada (${durationLabel})`,
          arrivedAt: currentCluster[0].timeFormatted,
          departedAt: currentCluster[currentCluster.length - 1].timeFormatted,
          startTime: currentCluster[0].timeFormatted,
          endTime: currentCluster[currentCluster.length - 1].timeFormatted,
          durationMinutes: effectiveDuration,
          latitude: avgLat,
          longitude: avgLon,
          isWorksite,
          worksiteName: isWorksite ? wsName : undefined,
          addressReference: currentCluster.find((c) => c.addressReference)?.addressReference,
          notes: currentCluster.find((c) => c.notes)?.notes,
        });
      }
    }

    // Final Return to Base Event
    if (points.length >= 2) {
      const lastPoint = points[points.length - 1];
      const isEnd = lastPoint.pointType === 'END' || lastProcessedIndex < points.length - 1;
      if (isEnd) {
        timelineEvents.push({
          id: `timeline-end-${lastPoint.id}`,
          type: 'RETURN_BASE',
          time: lastPoint.timeFormatted,
          title: `Retorno e Encerramento na Base`,
          description: lastPoint.addressReference || 'Chegada ao ponto base e encerramento do trajeto real',
          latitude: lastPoint.latitude,
          longitude: lastPoint.longitude,
        });
      }
    }
  }

  return {
    date,
    userId,
    userName,
    teamId,
    teamName,
    points,
    totalPoints,
    totalDistanceKm,
    startTime,
    endTime,
    totalDurationFormatted,
    visitedWorksites,
    stops,
    timelineEvents,
    hasEnoughData,
    lastUpdated: new Date().toISOString(),
  };
}

const OFFLINE_GPS_KEY = 'obras_offline_gps_breadcrumbs_v1';

/**
 * Saves a GPS point to the offline storage queue when no internet connection is present.
 */
export function queueOfflineGpsPoint(point: GpsPoint): void {
  try {
    const raw = localStorage.getItem(OFFLINE_GPS_KEY);
    const queue: GpsPoint[] = raw ? JSON.parse(raw) : [];
    queue.push({
      ...point,
      synced: false,
      source: 'OFFLINE_SYNC',
    });
    localStorage.setItem(OFFLINE_GPS_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error('Erro ao armazenar ponto GPS offline:', e);
  }
}

/**
 * Retrieves all offline pending GPS points.
 */
export function getOfflineGpsQueue(): GpsPoint[] {
  try {
    const raw = localStorage.getItem(OFFLINE_GPS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Clears synced offline points from queue.
 */
export function clearOfflineGpsQueue(syncedIds?: string[]): void {
  try {
    if (!syncedIds || syncedIds.length === 0) {
      localStorage.removeItem(OFFLINE_GPS_KEY);
      return;
    }
    const current = getOfflineGpsQueue();
    const remaining = current.filter((p) => !syncedIds.includes(p.id));
    localStorage.setItem(OFFLINE_GPS_KEY, JSON.stringify(remaining));
  } catch (e) {
    console.error('Erro ao limpar fila de GPS:', e);
  }
}
