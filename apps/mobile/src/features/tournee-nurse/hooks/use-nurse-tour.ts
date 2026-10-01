import { useCallback, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import {
  fetchNurseTourSummary,
  optimizeNurseTour,
  patchNurseTourOrder,
  resetNurseTourOrder,
  rescheduleNurseTourStop,
  type NurseTourPayload,
  type TourSortMode,
} from '../api/nurse-tour.service';
import {
  NURSE_TOUR_STALE_MS,
  findNextTourStop,
  nurseTourQueryKey,
  nurseTourQueryOptions,
  withDerivedSummary,
} from './nurse-tour-query';
import { useTourOrigin } from './use-tour-origin';

const FORWARD_SUMMARY_DAYS = 21;

export function useNurseTour(date: string) {
  const qc = useQueryClient();
  const { getOrigin, refreshOrigin } = useTourOrigin();

  const tourQuery = useQuery({
    ...nurseTourQueryOptions(date, getOrigin),
    select: withDerivedSummary,
  });

  const summaryFrom = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
  const summaryTo = dayjs().add(FORWARD_SUMMARY_DAYS, 'day').format('YYYY-MM-DD');
  const summaryQuery = useQuery({
    queryKey: ['nurse-tour-summary', summaryFrom, summaryTo],
    queryFn: () => fetchNurseTourSummary(summaryFrom, summaryTo),
    staleTime: NURSE_TOUR_STALE_MS,
  });

  const tour = tourQuery.data;

  useEffect(() => {
    const adjacent = [dayjs(date).subtract(1, 'day'), dayjs(date).add(1, 'day')];
    for (const d of adjacent) {
      void qc.prefetchQuery(nurseTourQueryOptions(d.format('YYYY-MM-DD'), getOrigin));
    }
  }, [date, getOrigin, qc]);

  const applyTour = useCallback(
    (data: NurseTourPayload) => {
      qc.setQueryData(nurseTourQueryKey(date), data);
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
      const updated = await patchNurseTourOrder(date, ids);
      applyTour(updated);
    },
    [applyTour, date, tour],
  );

  const optimize = useCallback(
    async (mode: TourSortMode, force = false) => {
      const updated = await optimizeNurseTour(date, mode, force, getOrigin() ?? undefined);
      applyTour(updated);
    },
    [applyTour, date, getOrigin],
  );

  const resetOrder = useCallback(async () => {
    const updated = await resetNurseTourOrder(date, getOrigin() ?? undefined);
    applyTour(updated);
  }, [applyTour, date, getOrigin]);

  const reschedule = useCallback(
    async (stopId: string, payload: { scheduled_at: string; availability: string }) => {
      const updated = await rescheduleNurseTourStop(stopId, payload);
      applyTour(updated);
    },
    [applyTour],
  );

  const nextStop = useMemo(() => findNextTourStop(tour), [tour]);

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
    resetOrder,
    reschedule,
    nextStop,
  };
}
