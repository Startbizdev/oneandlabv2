import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import dayjs from 'dayjs';
import {
  computeTourSummaryFromStops,
  resolveTourNextStopId,
} from '@oneandlab/shared-utils';
import {
  fetchPreleveurTour,
  fetchPreleveurTourSummary,
  optimizePreleveurTour,
  patchPreleveurTourOrder,
  type PreleveurTourPayload,
  type TourSortMode,
} from '../api/preleveur-tour.service';

const STALE_MS = 60_000;
const FORWARD_SUMMARY_DAYS = 21;

function tourQueryKey(date: string, coords: { lat: number; lng: number } | null) {
  return ['preleveur-tour', date, coords?.lat ?? null, coords?.lng ?? null] as const;
}

function withDerivedSummary(tour: PreleveurTourPayload): PreleveurTourPayload {
  const summary = computeTourSummaryFromStops(tour.stops, tour.summary.estimated_km);
  return {
    ...tour,
    summary,
    next_stop_id: resolveTourNextStopId(tour.stops),
  };
}

export function usePreleveurTour(date: string) {
  const qc = useQueryClient();
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const tourQuery = useQuery({
    queryKey: tourQueryKey(date, coords),
    queryFn: () => fetchPreleveurTour(date, coords ?? undefined),
    staleTime: STALE_MS,
    select: withDerivedSummary,
  });

  const summaryFrom = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
  const summaryTo = dayjs().add(FORWARD_SUMMARY_DAYS, 'day').format('YYYY-MM-DD');
  const summaryQuery = useQuery({
    queryKey: ['preleveur-tour-summary', summaryFrom, summaryTo],
    queryFn: () => fetchPreleveurTourSummary(summaryFrom, summaryTo),
    staleTime: STALE_MS,
  });

  const tour = tourQuery.data;

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

  useEffect(() => {
    void refreshCoords();
  }, [refreshCoords]);

  const applyTour = useCallback(
    (data: PreleveurTourPayload) => {
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
      const updated = await patchPreleveurTourOrder(date, ids);
      applyTour(withDerivedSummary(updated));
    },
    [applyTour, date, tour],
  );

  const optimize = useCallback(
    async (mode: TourSortMode, force = false) => {
      const updated = await optimizePreleveurTour(date, mode, force, coords ?? undefined);
      applyTour(withDerivedSummary(updated));
    },
    [applyTour, coords, date],
  );

  const dayCounts = useMemo(() => summaryQuery.data ?? {}, [summaryQuery.data]);

  return {
    tour,
    isLoading: tourQuery.isLoading,
    isFetching: tourQuery.isFetching,
    refetch: tourQuery.refetch,
    dayCounts,
    refreshCoords,
    moveStop,
    optimize,
  };
}
