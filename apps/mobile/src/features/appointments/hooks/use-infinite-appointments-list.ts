import { useInfiniteQuery } from '@tanstack/react-query';
import type { Appointment } from '@oneandlab/shared-types';
import type { AppointmentListFilters } from '@oneandlab/shared-types';
import { APPOINTMENTS_LIST_PAGE_SIZE } from '@/constants/appointments-pagination';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/store/auth-store';
import { fetchAppointmentsPaginated } from '../api/appointments.service';

export function useInfiniteAppointmentsList(filters: AppointmentListFilters) {
  const token = useAuthStore((s) => s.token);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const pageSize = filters.limit ?? APPOINTMENTS_LIST_PAGE_SIZE;

  return useInfiniteQuery({
    queryKey: queryKeys.appointments.infinite(filters),
    queryFn: async ({ pageParam = 1 }) => {
      const result = await fetchAppointmentsPaginated({
        ...filters,
        page: pageParam,
        limit: pageSize,
      });
      return result;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.has_more ? lastPage.pagination.page + 1 : undefined,
    enabled: isHydrated && Boolean(token),
    staleTime: 45_000,
  });
}

export function flattenInfiniteAppointments(
  pages: { appointments: Appointment[] }[] | undefined,
): Appointment[] {
  if (!pages?.length) return [];
  return pages.flatMap((p) => p.appointments);
}
