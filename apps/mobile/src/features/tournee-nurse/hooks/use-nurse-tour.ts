import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import dayjs from 'dayjs';
import {
  computeTourSummaryFromStops,
  resolveTourNextStopId,
} from '@oneandlab/shared-utils';
import {
  fetchNurseTour,
  fetchNurseTourSummary,
  optimizeNurseTour,
  patchNurseTourOrder,
  resetNurseTourOrder,
  rescheduleNurseTourStop,
  updateNurseTourStopStatus,
  type NurseTourPayload,
  type TourSortMode,
  type TourVisitStatus,
} from '../api/nurse-tour.service';

const STALE_MS = 60_000;
const FORWARD_SUMMARY_DAYS = 21;

function tourQueryKey(date: string, coords: { lat: number; lng: number } | null) {
  return ['nurse-tour', date, coords?.lat ?? null, coords?.lng ?? null] as const;
}

function withDerivedSummary(tour: NurseTourPayload): NurseTourPayload {
  const summary = computeTourSummaryFromStops(tour.stops, tour.summary.estimated_km);
  return {
    ...tour,
    summary,
    next_stop_id: resolveTourNextStopId(tour.stops),
  };
}

export function useNurseTour(date: string) {
  const qc = useQueryClient();
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const tourQuery = useQuery({
    queryKey: tourQueryKey(date, coords),
    queryFn: () => fetchNurseTour(date, coords ?? undefined),
    staleTime: STALE_MS,
    select: withDerivedSummary,
  });

  const summaryFrom = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
  const summaryTo = dayjs().add(FORWARD_SUMMARY_DAYS, 'day').format('YYYY-MM-DD');
  const summaryQuery = useQuery({
    queryKey: ['nurse-tour-summary', summaryFrom, summaryTo],
    queryFn: () => fetchNurseTourSummary(summaryFrom, summaryTo),
    staleTime: STALE_MS,
  });

  const tour = tourQuery.data;

  useEffect(() => {
    const adjacent = [dayjs(date).subtract(1, 'day'), dayjs(date).add(1, 'day')];
    for (const d of adjacent) {
      void qc.prefetchQuery({
        queryKey: tourQueryKey(d.format('YYYY-MM-DD'), coords),
        queryFn: () => fetchNurseTour(d.format('YYYY-MM-DD'), coords ?? undefined),
        staleTime: STALE_MS,
      });
    }
  }, [coords, date, qc]);

  const refreshCoords = useCallback(async () => {
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') return;
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    } catch {
      /* GPS optionnel */
    }
  }, []);

  const applyTour = useCallback(
    (data: NurseTourPayload) => {
      qc.setQueryData(tourQueryKey(date, coords), data);
    },
    [coords, date, qc],
  );

  const moveStop = useCallback(
    async (appointmentId: string, direction: 'up' | 'down') => {
      const current = tour;
      if (!current) return;

      const ids = current.stops.map((s) => s.appointment_id);
      const idx = ids.indexOf(appointmentId);
      if (idx < 0) return;
      const swap = direction === 'up' ? idx - 1 : idx + 1;
      if (swap < 0 || swap >= ids.length) return;
      [ids[idx], ids[swap]] = [ids[swap]!, ids[idx]!];
      const updated = await patchNurseTourOrder(date, ids);
      applyTour(updated);
    },
    [applyTour, date, tour],
  );

  const optimize = useCallback(
    async (mode: TourSortMode, force = false) => {
      const updated = await optimizeNurseTour(date, mode, force, coords ?? undefined);
      applyTour(updated);
    },
    [applyTour, coords, date],
  );

  const resetOrder = useCallback(async () => {
    const updated = await resetNurseTourOrder(date, coords ?? undefined);
    applyTour(updated);
  }, [applyTour, coords, date]);

  const setStatus = useCallback(
    async (stopId: string, status: TourVisitStatus) => {
      const key = tourQueryKey(date, coords);
      const current = qc.getQueryData<NurseTourPayload>(key) ?? tour;
      if (!current) return;

      const visitedAt =
        status === 'done' || status === 'on_site' ? new Date().toISOString() : null;
      const optimisticStops = current.stops.map((s) => {
        if (s.stop_id !== stopId) return s;
        const nextStatus =
          status === 'todo' && s.status === 'completed' ? ('confirmed' as const) : s.status;
        return {
          ...s,
          visit_status: status,
          visited_at: visitedAt,
          status: nextStatus,
        };
      });
      applyTour({ ...current, stops: optimisticStops });

      try {
        const updated = await updateNurseTourStopStatus(stopId, status);
        applyTour(updated);
      } catch (error) {
        applyTour(current);
        throw error;
      }
    },
    [applyTour, coords, date, qc, tour],
  );

  const reschedule = useCallback(
    async (stopId: string, payload: { scheduled_at: string; availability: string }) => {
      const updated = await rescheduleNurseTourStop(stopId, payload);
      applyTour(updated);
    },
    [applyTour],
  );

  const nextStop = useMemo(() => {
    if (!tour?.next_stop_id) return null;
    return tour.stops.find((s) => s.stop_id === tour.next_stop_id) ?? null;
  }, [tour]);

  const dayCounts = summaryQuery.data ?? {};

  return {
    tour,
    isLoading: tourQuery.isLoading,
    isFetching: tourQuery.isFetching,
    refetch: tourQuery.refetch,
    dayCounts,
    coords,
    refreshCoords,
    moveStop,
    optimize,
    resetOrder,
    setStatus,
    reschedule,
    nextStop,
  };
}
