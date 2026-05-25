import type { AppointmentListFilters } from '@oneandlab/shared-types';
import { CACHE_STALE_APPOINTMENTS_LIST_MS } from '@oneandlab/shared-constants';
import { APPOINTMENTS_LIST_PAGE_SIZE } from '@/constants/appointments-pagination';
import { queryKeys } from '@/lib/query-keys';
import { queryClient } from '@/lib/query-client';
import { fetchAppointmentsPaginated } from '../api/appointments.service';
import { NURSE_DEMANDES_LIST_FILTERS } from '@/features/nurse/constants/nurse-demandes-filters';

async function prefetchInfiniteFirstPage(filters: AppointmentListFilters): Promise<void> {
  await queryClient.prefetchInfiniteQuery({
    queryKey: queryKeys.appointments.infinite(filters),
    queryFn: async ({ pageParam = 1 }) =>
      fetchAppointmentsPaginated({
        ...filters,
        page: pageParam as number,
        limit: filters.limit ?? APPOINTMENTS_LIST_PAGE_SIZE,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage: Awaited<ReturnType<typeof fetchAppointmentsPaginated>>) =>
      lastPage.pagination.has_more ? lastPage.pagination.page + 1 : undefined,
    staleTime: CACHE_STALE_APPOINTMENTS_LIST_MS,
  });
}

/** Précharge la première page RDV dès qu’une session est disponible. */
export function prefetchAppointmentsForUser(role: string | undefined): void {
  if (!role) return;

  const mainFilters: AppointmentListFilters =
    role === 'nurse'
      ? { nurse_tab: 'soins', limit: APPOINTMENTS_LIST_PAGE_SIZE }
      : role === 'preleveur'
        ? {
            type: 'blood_test',
            limit: APPOINTMENTS_LIST_PAGE_SIZE,
            assigned_only: true,
            status: 'confirmed,in_progress,on_the_way',
          }
        : role === 'patient'
          ? { limit: APPOINTMENTS_LIST_PAGE_SIZE, patient_period: 'upcoming' }
          : { limit: APPOINTMENTS_LIST_PAGE_SIZE };

  void prefetchInfiniteFirstPage(mainFilters).catch(() => undefined);

  if (role === 'nurse') {
    void prefetchInfiniteFirstPage({
      ...NURSE_DEMANDES_LIST_FILTERS,
      limit: APPOINTMENTS_LIST_PAGE_SIZE,
    }).catch(() => undefined);
  }
}
