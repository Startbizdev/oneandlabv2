import { useMemo } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import type { Appointment } from '@oneandlab/shared-types';
import { queryKeys } from '@/lib/query-keys';
import { fetchAppointment } from '../../api/appointments.service';

function sortByScheduled(a: Appointment, b: Appointment) {
  return new Date(a.scheduled_at || 0).getTime() - new Date(b.scheduled_at || 0).getTime();
}

export function useAppointmentBatch(primary: Appointment | null | undefined) {
  const siblingIds = useMemo(() => {
    const sibs = primary?.batch_siblings;
    if (!Array.isArray(sibs) || sibs.length === 0) return [];
    return sibs.map((s) => String(s.id)).filter(Boolean);
  }, [primary?.batch_siblings, primary?.id]);

  const siblingQueries = useQueries({
    queries: siblingIds.map((sid) => ({
      queryKey: queryKeys.appointments.detail(sid),
      queryFn: async () => {
        const res = await fetchAppointment(sid);
        if (!res.success || !res.data) return null;
        return res.data;
      },
      enabled: Boolean(sid),
      staleTime: 0,
      refetchOnMount: 'always',
    })),
  });

  const siblingsLoading = siblingQueries.some((q) => q.isLoading);

  const batchSorted = useMemo(() => {
    if (!primary) return [] as Appointment[];
    const loaded = siblingQueries
      .map((q) => q.data)
      .filter((a): a is Appointment => a != null);
    if (loaded.length === 0) return [primary];
    return [primary, ...loaded].sort(sortByScheduled);
  }, [primary, siblingQueries]);

  const isMultiBatch = useMemo(() => {
    if (!primary) return false;
    if (batchSorted.length > 1) return true;
    const sibs = primary.batch_siblings;
    return Array.isArray(sibs) && sibs.length > 0;
  }, [primary, batchSorted.length]);

  const batchIds = useMemo(
    () => batchSorted.map((a) => String(a.id)),
    [batchSorted],
  );

  return {
    batchSorted,
    isMultiBatch,
    batchIds,
    siblingsLoading,
    refetchSiblings: () => siblingQueries.forEach((q) => void q.refetch()),
  };
}

/** Charge le RDV principal (réutilisable hors écran détail). */
export function useAppointmentDetailQuery(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.appointments.detail(id ?? ''),
    queryFn: async () => {
      if (!id) return null;
      const res = await fetchAppointment(id);
      if (!res.success) throw new Error(res.error ?? 'RDV introuvable');
      return res.data ?? null;
    },
    enabled: Boolean(id),
  });
}
