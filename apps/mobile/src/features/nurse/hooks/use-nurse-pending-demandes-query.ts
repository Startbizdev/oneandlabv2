import { useQuery } from '@tanstack/react-query';
import { APPOINTMENT_PENDING_POLL_INTERVAL_MS } from '@oneandlab/shared-constants';
import type { AppointmentListFilters } from '@oneandlab/shared-types';
import { fetchAppointments } from '@/features/appointments/api/appointments.service';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/store/auth-store';

/** Mêmes filtres que `NurseDemandesScreen` — cache React Query partagé. */
export const NURSE_DEMANDES_LIST_FILTERS: AppointmentListFilters = {
  status: 'pending',
  nurse_tab: 'soins',
  nurse_segment: 'en_attente',
  limit: 100,
};

/** Source unique pour badge « Demandes » et polling offres entrantes. */
export function useNursePendingDemandesQuery(enabled = true) {
  const user = useAuthStore((s) => s.user);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const myId = user?.id;
  const isNurse = user?.role === 'nurse';

  return useQuery({
    queryKey: queryKeys.appointments.list(NURSE_DEMANDES_LIST_FILTERS),
    queryFn: async () => {
      const res = await fetchAppointments(NURSE_DEMANDES_LIST_FILTERS);
      if (!res.success) return [];
      return res.data ?? [];
    },
    enabled: enabled && isHydrated && isNurse && Boolean(myId),
    refetchInterval: APPOINTMENT_PENDING_POLL_INTERVAL_MS,
    staleTime: 8_000,
  });
}
