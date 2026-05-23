import type { AppointmentListFilters } from '@oneandlab/shared-types';
import { queryKeys } from '@/lib/query-keys';
import { queryClient } from '@/lib/query-client';
import { fetchAppointments } from '../api/appointments.service';
import { NURSE_DEMANDES_LIST_FILTERS } from '@/features/nurse/constants/nurse-demandes-filters';

const LIST_STALE_MS = 45_000;

async function prefetchList(filters: AppointmentListFilters): Promise<void> {
  await queryClient.prefetchQuery({
    queryKey: queryKeys.appointments.list(filters),
    queryFn: async () => {
      const res = await fetchAppointments(filters);
      if (!res.success) throw new Error(res.error ?? 'Erreur chargement RDV');
      return res.data ?? [];
    },
    staleTime: LIST_STALE_MS,
  });
}

/** Précharge la liste RDV principale dès qu’une session est disponible. */
export function prefetchAppointmentsForUser(role: string | undefined): void {
  if (!role) return;

  const mainFilters: AppointmentListFilters =
    role === 'nurse'
      ? { nurse_tab: 'soins', limit: 100 }
      : role === 'preleveur'
        ? {
            type: 'blood_test',
            limit: 500,
            assigned_only: true,
            status: 'confirmed,in_progress,on_the_way',
          }
        : { limit: 100 };

  void prefetchList(mainFilters).catch(() => undefined);

  if (role === 'nurse') {
    void prefetchList(NURSE_DEMANDES_LIST_FILTERS).catch(() => undefined);
  }
}
