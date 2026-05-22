import { useQuery } from '@tanstack/react-query';
import type { AppointmentListFilters } from '@oneandlab/shared-types';
import { queryKeys } from '@/lib/query-keys';
import { fetchAppointments } from '../api/appointments.service';

export function useAppointmentsList(filters: AppointmentListFilters) {
  return useQuery({
    queryKey: queryKeys.appointments.list(filters),
    queryFn: async () => {
      const res = await fetchAppointments(filters);
      if (!res.success) throw new Error(res.error ?? 'Erreur chargement RDV');
      return res.data ?? [];
    },
    staleTime: 45_000,
    /** Refetch silencieux : la liste reste affichée (voir QueryFlatList). */
    refetchOnMount: 'always',
  });
}
