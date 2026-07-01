import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import dayjs from 'dayjs';
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
import {
  buildMockDayCounts,
  buildMockNurseTour,
  isMockTourId,
  NURSE_TOUR_PREVIEW_MOCK,
} from '../utils/tour-mock-data';

const STALE_MS = 60_000;

function shouldUseMock(data: NurseTourPayload | undefined): boolean {
  return NURSE_TOUR_PREVIEW_MOCK && (!data || data.stops.length === 0);
}

function recomputeNextStop(tour: NurseTourPayload): NurseTourPayload {
  const next = tour.stops.find((s) => s.visit_status === 'todo' || s.visit_status === 'en_route');
  const done = tour.stops.filter((s) => s.visit_status === 'done' || s.visit_status === 'skipped').length;
  return {
    ...tour,
    next_stop_id: next?.stop_id ?? null,
    summary: {
      ...tour.summary,
      done_stops: done,
      total_stops: tour.stops.length,
    },
  };
}

export function useNurseTour(date: string) {
  const qc = useQueryClient();
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [mockTour, setMockTour] = useState<NurseTourPayload | null>(null);

  const tourQuery = useQuery({
    queryKey: ['nurse-tour', date, coords?.lat ?? null, coords?.lng ?? null],
    queryFn: () => fetchNurseTour(date, coords ?? undefined),
    staleTime: STALE_MS,
  });

  const summaryFrom = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
  const summaryTo = dayjs().add(FORWARD_SUMMARY_DAYS, 'day').format('YYYY-MM-DD');
  const summaryQuery = useQuery({
    queryKey: ['nurse-tour-summary', summaryFrom, summaryTo],
    queryFn: () => fetchNurseTourSummary(summaryFrom, summaryTo),
    staleTime: STALE_MS,
  });

  const isMockActive = shouldUseMock(tourQuery.data);

  useEffect(() => {
    if (!isMockActive) {
      setMockTour(null);
      return;
    }
    setMockTour(buildMockNurseTour(date));
  }, [date, isMockActive]);

  const tour = isMockActive ? (mockTour ?? buildMockNurseTour(date)) : tourQuery.data;

  useEffect(() => {
    const adjacent = [dayjs(date).subtract(1, 'day'), dayjs(date).add(1, 'day')];
    for (const d of adjacent) {
      void qc.prefetchQuery({
        queryKey: ['nurse-tour', d.format('YYYY-MM-DD'), coords?.lat ?? null, coords?.lng ?? null],
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
      if (isMockActive) {
        setMockTour(data);
        return;
      }
      qc.setQueryData(['nurse-tour', date, coords?.lat ?? null, coords?.lng ?? null], data);
    },
    [coords?.lat, coords?.lng, date, isMockActive, qc],
  );

  const moveStop = useCallback(
    async (appointmentId: string, direction: 'up' | 'down') => {
      const current = tour;
      if (!current) return;

      if (isMockActive) {
        const ids = current.stops.map((s) => s.appointment_id);
        const idx = ids.indexOf(appointmentId);
        if (idx < 0) return;
        const swap = direction === 'up' ? idx - 1 : idx + 1;
        if (swap < 0 || swap >= ids.length) return;
        [ids[idx], ids[swap]] = [ids[swap]!, ids[idx]!];
        const stops = ids.map((id, i) => {
          const stop = current.stops.find((s) => s.appointment_id === id)!;
          return { ...stop, position: i + 1 };
        });
        applyTour(recomputeNextStop({ ...current, plan: { ...current.plan, sort_mode: 'manual', manual_order_locked: true }, stops }));
        return;
      }

      const ids = current.stops.map((s) => s.appointment_id);
      const idx = ids.indexOf(appointmentId);
      if (idx < 0) return;
      const swap = direction === 'up' ? idx - 1 : idx + 1;
      if (swap < 0 || swap >= ids.length) return;
      [ids[idx], ids[swap]] = [ids[swap]!, ids[idx]!];
      const updated = await patchNurseTourOrder(date, ids);
      applyTour(updated);
    },
    [applyTour, date, isMockActive, tour],
  );

  const optimize = useCallback(
    async (mode: TourSortMode, force = false) => {
      if (isMockActive) {
        applyTour(
          recomputeNextStop({
            ...(mockTour ?? buildMockNurseTour(date)),
            plan: {
              ...(mockTour ?? buildMockNurseTour(date)).plan,
              sort_mode: mode,
              manual_order_locked: false,
            },
          }),
        );
        return;
      }
      const updated = await optimizeNurseTour(date, mode, force, coords ?? undefined);
      applyTour(updated);
    },
    [applyTour, coords, date, isMockActive, mockTour],
  );

  const resetOrder = useCallback(async () => {
    if (isMockActive) {
      applyTour(buildMockNurseTour(date));
      return;
    }
    const updated = await resetNurseTourOrder(date, coords ?? undefined);
    applyTour(updated);
  }, [applyTour, coords, date, isMockActive]);

  const setStatus = useCallback(
    async (stopId: string, status: TourVisitStatus) => {
      if (isMockActive || isMockTourId(stopId)) {
        const current = mockTour ?? buildMockNurseTour(date);
        const stops = current.stops.map((s) =>
          s.stop_id === stopId ? { ...s, visit_status: status } : s,
        );
        applyTour(recomputeNextStop({ ...current, stops }));
        return;
      }
      const updated = await updateNurseTourStopStatus(stopId, status);
      applyTour(updated);
    },
    [applyTour, date, isMockActive, mockTour],
  );

  const reschedule = useCallback(
    async (stopId: string, payload: { scheduled_at: string; availability: string }) => {
      if (isMockActive || isMockTourId(stopId)) {
        const current = mockTour ?? buildMockNurseTour(date);
        let availability: unknown = payload.availability;
        try {
          availability = JSON.parse(payload.availability);
        } catch {
          /* keep string */
        }
        const stops = current.stops.map((s) =>
          s.stop_id === stopId
            ? { ...s, scheduled_at: payload.scheduled_at, availability }
            : s,
        );
        applyTour({ ...current, stops });
        return;
      }
      const updated = await rescheduleNurseTourStop(stopId, payload);
      applyTour(updated);
    },
    [applyTour, isMockActive, mockTour, date],
  );

  const nextStop = useMemo(() => {
    if (!tour?.next_stop_id) return null;
    return tour.stops.find((s) => s.stop_id === tour.next_stop_id) ?? null;
  }, [tour]);

  const dayCounts = useMemo(() => {
    const api = summaryQuery.data ?? {};
    if (!NURSE_TOUR_PREVIEW_MOCK) return api;
    return { ...buildMockDayCounts(), ...api };
  }, [summaryQuery.data]);

  return {
    tour,
    isLoading: tourQuery.isLoading && !isMockActive,
    isFetching: tourQuery.isFetching,
    isMockActive,
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

const FORWARD_SUMMARY_DAYS = 21;
