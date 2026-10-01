import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import {
  computeTourSummaryFromStops,
  isTourStopDone,
  resolveTourNextStopId,
} from '@oneandlab/shared-utils';
import { useTourOrigin } from '@/features/tournee-nurse/hooks/use-tour-origin';
import {
  fetchPreleveurTour,
  fetchPreleveurTourSummary,
  optimizePreleveurTour,
  patchPreleveurTourOrder,
  type PreleveurTourPayload,
  type TourSortMode,
} from '../api/preleveur-tour.service';
import { preleveurTourQueryKey } from './preleveur-tour-query';

const STALE_MS = 60_000;
const FORWARD_SUMMARY_DAYS = 21;

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
  const { getOrigin, refreshOrigin } = useTourOrigin();

  const tourQuery = useQuery({
    queryKey: preleveurTourQueryKey(date),
    queryFn: () => fetchPreleveurTour(date, getOrigin() ?? undefined),
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

  const applyTour = useCallback(
    (data: PreleveurTourPayload) => {
      qc.setQueryData(preleveurTourQueryKey(date), data);
    },
    [date, qc],
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
      applyTour(updated);
    },
    [applyTour, date, tour],
  );

  const optimize = useCallback(
    async (mode: TourSortMode, force = false) => {
      const updated = await optimizePreleveurTour(date, mode, force, getOrigin() ?? undefined);
      applyTour(updated);
    },
    [applyTour, date, getOrigin],
  );

  const nextStop = useMemo(
    () => tour?.stops.find((stop) => !isTourStopDone(stop)) ?? null,
    [tour],
  );

  const dayCounts = useMemo(() => summaryQuery.data ?? {}, [summaryQuery.data]);

  return {
    tour,
    isLoading: tourQuery.isLoading,
    isFetching: tourQuery.isFetching,
    isError: tourQuery.isError,
    error: tourQuery.error,
    refetch: tourQuery.refetch,
    dayCounts,
    refreshOrigin,
    moveStop,
    optimize,
    nextStop,
  };
}
