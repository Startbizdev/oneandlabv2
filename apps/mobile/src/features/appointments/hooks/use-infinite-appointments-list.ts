import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import type { Appointment } from '@oneandlab/shared-types';
import type { AppointmentListFilters } from '@oneandlab/shared-types';
import { CACHE_STALE_APPOINTMENTS_LIST_MS } from '@oneandlab/shared-constants';
import { APPOINTMENTS_LIST_PAGE_SIZE } from '@/constants/appointments-pagination';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/store/auth-store';
import { fetchAppointmentsPaginated } from '../api/appointments.service';

/**
 * Liste paginée. Avec `q`, le serveur parcourt la liste (champs chiffrés) : la page suivante
 * reprend à `pagination.next_cursor` au lieu de `page + 1`.
 */
export function useInfiniteAppointmentsList(filters: AppointmentListFilters) {
  const token = useAuthStore((s) => s.token);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const pageSize = filters.limit ?? APPOINTMENTS_LIST_PAGE_SIZE;
  const searching = Boolean(filters.q?.trim());

  return useInfiniteQuery({
    queryKey: queryKeys.appointments.infinite(filters),
    queryFn: async ({ pageParam }) => {
      const result = await fetchAppointmentsPaginated({
        ...filters,
        ...(searching ? { cursor: pageParam } : { page: pageParam }),
        limit: pageSize,
      });
      return result;
    },
    initialPageParam: searching ? 0 : 1,
    getNextPageParam: (lastPage) => {
      if (!lastPage.pagination.has_more) return undefined;
      return searching ? lastPage.pagination.next_cursor : lastPage.pagination.page + 1;
    },
    enabled: isHydrated && Boolean(token),
    staleTime: CACHE_STALE_APPOINTMENTS_LIST_MS,
    placeholderData: keepPreviousData,
  });
}

export function flattenInfiniteAppointments(
  pages: { appointments: Appointment[] }[] | undefined,
): Appointment[] {
  if (!pages?.length) return [];
  return pages.flatMap((p) => p.appointments);
}
