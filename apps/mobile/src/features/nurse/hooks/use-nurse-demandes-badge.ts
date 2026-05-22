import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { APPOINTMENT_PENDING_POLL_INTERVAL_MS } from '@oneandlab/shared-constants';
import type { AppointmentListFilters } from '@oneandlab/shared-types';
import { isPendingIncomingOffer } from '@oneandlab/shared-utils';
import { fetchAppointments } from '@/features/appointments/api/appointments.service';
import { groupAppointmentsForNurseMesDemandes } from '@/utils/appointment-batch';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/store/auth-store';

/** Mêmes filtres que `NurseDemandesScreen` — cache React Query partagé. */
export const NURSE_DEMANDES_LIST_FILTERS: AppointmentListFilters = {
  status: 'pending',
  nurse_tab: 'soins',
  nurse_segment: 'en_attente',
  limit: 100,
};

/** Nombre de lignes « Mes demandes » (lots regroupés) pour le badge onglet. */
export function useNurseDemandesBadgeCount(enabled = true) {
  const user = useAuthStore((s) => s.user);
  const myId = user?.id;
  const isNurse = user?.role === 'nurse';

  const query = useQuery({
    queryKey: queryKeys.appointments.list(NURSE_DEMANDES_LIST_FILTERS),
    queryFn: async () => {
      const res = await fetchAppointments(NURSE_DEMANDES_LIST_FILTERS);
      if (!res.success) return [];
      return res.data ?? [];
    },
    enabled: enabled && isNurse && !!myId,
    refetchInterval: APPOINTMENT_PENDING_POLL_INTERVAL_MS,
    staleTime: 8_000,
  });

  const count = useMemo(() => {
    const incoming = (query.data ?? []).filter(
      (a) =>
        a.status === 'pending' &&
        isPendingIncomingOffer(a, myId) &&
        (a.assigned_nurse_id === myId || !a.assigned_nurse_id),
    );
    return groupAppointmentsForNurseMesDemandes(incoming).length;
  }, [query.data, myId]);

  return { count, ...query };
}
