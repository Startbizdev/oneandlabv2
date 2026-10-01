import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { fetchLabResults } from '../api/lab-results.service';

const PAGE_SIZE = 30;

export function useLabResultsInfinite(search: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.labResults.list(search),
    queryFn: async ({ pageParam }) => {
      const res = await fetchLabResults(search, pageParam, PAGE_SIZE);
      if (!res.success || !res.data) throw new Error(res.error ?? 'Chargement impossible');
      return res.data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.page < lastPage.pagination.pages ? lastPage.pagination.page + 1 : undefined,
    placeholderData: keepPreviousData,
  });
}
