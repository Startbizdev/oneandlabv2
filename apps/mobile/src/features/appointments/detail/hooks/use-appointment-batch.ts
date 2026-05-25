import { useMemo } from 'react';
import type { Appointment } from '@oneandlab/shared-types';
import { CACHE_STALE_APPOINTMENT_DETAIL_MS } from '@oneandlab/shared-constants';

type AppointmentWithBatch = Appointment & {
  batch_appointments?: Appointment[];
};

function sortByScheduled(a: Appointment, b: Appointment) {
  return new Date(a.scheduled_at || 0).getTime() - new Date(b.scheduled_at || 0).getTime();
}

export function useAppointmentBatch(primary: Appointment | null | undefined) {
  const batchSorted = useMemo(() => {
    if (!primary) return [] as Appointment[];
    const embedded = (primary as AppointmentWithBatch).batch_appointments;
    if (Array.isArray(embedded) && embedded.length > 0) {
      return [primary, ...embedded].sort(sortByScheduled);
    }
    return [primary];
  }, [primary]);

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
    siblingsLoading: false,
    refetchSiblings: () => undefined,
  };
}

/** @deprecated Utiliser useAppointmentDetail depuis use-appointment-detail.ts */
export { useAppointmentDetail as useAppointmentDetailQuery } from '../../hooks/use-appointment-detail';

export const APPOINTMENT_DETAIL_STALE_MS = CACHE_STALE_APPOINTMENT_DETAIL_MS;
