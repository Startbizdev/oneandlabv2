import { useQuery } from '@tanstack/react-query';
import { useIsFocused } from '@react-navigation/native';
import { APPOINTMENT_PENDING_POLL_INTERVAL_MS } from '@oneandlab/shared-constants';
import { fetchAppointments } from '@/features/appointments/api/appointments.service';
import { NURSE_DEMANDES_LIST_FILTERS } from '@/features/nurse/constants/nurse-demandes-filters';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/store/auth-store';
import { focusedRefetchInterval } from '@/lib/focused-refetch-interval';
import { useAppActive } from '@/lib/hooks/use-app-active';

export { NURSE_DEMANDES_LIST_FILTERS };

/** Source unique pour badge « Demandes » et polling offres entrantes. */
export function useNursePendingDemandesQuery(enabled = true) {
  const user = useAuthStore((s) => s.user);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const myId = user?.id;
  const isNurse = user?.role === 'nurse';
  const focused = useIsFocused();
  const appActive = useAppActive();

  return useQuery({
    queryKey: queryKeys.appointments.list(NURSE_DEMANDES_LIST_FILTERS),
    queryFn: async () => {
      const res = await fetchAppointments(NURSE_DEMANDES_LIST_FILTERS);
      if (!res.success) return [];
      return res.data ?? [];
    },
    enabled: enabled && isHydrated && isNurse && Boolean(myId),
    refetchInterval: focusedRefetchInterval(APPOINTMENT_PENDING_POLL_INTERVAL_MS, focused, appActive),
    refetchIntervalInBackground: false,
    staleTime: 8_000,
  });
}
