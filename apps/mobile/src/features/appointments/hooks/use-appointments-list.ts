import { useQuery } from '@tanstack/react-query';
import type { AppointmentListFilters } from '@oneandlab/shared-types';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/store/auth-store';
import { fetchAppointments } from '../api/appointments.service';

export function useAppointmentsList(filters: AppointmentListFilters) {
  const token = useAuthStore((s) => s.token);
  const isHydrated = useAuthStore((s) => s.isHydrated);

  return useQuery({
    queryKey: queryKeys.appointments.list(filters),
    queryFn: async () => {
      const res = await fetchAppointments(filters);
      if (!res.success) throw new Error(res.error ?? 'Erreur chargement RDV');
      return res.data ?? [];
    },
    enabled: isHydrated && Boolean(token),
    staleTime: 45_000,
  });
}
