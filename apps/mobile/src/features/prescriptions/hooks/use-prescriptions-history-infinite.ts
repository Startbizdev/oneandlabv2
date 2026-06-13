import { useInfiniteQuery } from '@tanstack/react-query';
import {
  fetchNursePrescriptions,
  fetchProPrescriptions,
  type PrescriptionsPagination,
} from '../api/prescriptions.service';

const PAGE_SIZE = 20;

export function usePrescriptionsHistoryInfinite(
  roleBase: 'pro' | 'nurse',
  patientId?: string,
  enabled = true,
) {
  return useInfiniteQuery({
    queryKey: ['prescriptions', 'history', roleBase, patientId ?? 'all'] as const,
    queryFn: async ({ pageParam = 1 }) => {
      const fetcher = roleBase === 'nurse' ? fetchNursePrescriptions : fetchProPrescriptions;
      const res = await fetcher(pageParam, PAGE_SIZE, patientId || undefined);
      return {
        rows: res.data ?? [],
        pagination: (res.pagination as PrescriptionsPagination | undefined) ?? {
          page: pageParam,
          limit: PAGE_SIZE,
          total: 0,
          pages: 1,
        },
      };
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const page = lastPage.pagination.page ?? 1;
      const pages = lastPage.pagination.pages ?? 1;
      return page < pages ? page + 1 : undefined;
    },
    enabled,
  });
}
