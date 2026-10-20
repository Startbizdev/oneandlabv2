import { useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import type { StaffHubSearchItem } from '@oneandlab/shared-types';
import { fetchStaffPatientHubSearch } from '../api/staff-hub-search.service';
import { queryKeys } from '@/lib/query-keys';

const PAGE_SIZE = 50;

/** Hub patients paginé (`GET /search?offset=`) : tous les patients du soignant, page par page. */
export function useInfiniteStaffHubSearch(search: string) {
  const q = search.trim();
  const query = useInfiniteQuery({
    queryKey: queryKeys.patients.hubSearchPages(q),
    queryFn: async ({ pageParam }) => {
      const res = await fetchStaffPatientHubSearch(q, PAGE_SIZE, pageParam);
      if (!res.success) throw new Error(res.error ?? 'Recherche impossible');
      return {
        items: res.data?.items ?? [],
        hasMore: res.data?.has_more ?? false,
        total: res.data?.total,
        offset: pageParam,
      };
    },
    initialPageParam: 0,
    getNextPageParam: (last) => (last.hasMore ? last.offset + PAGE_SIZE : undefined),
    staleTime: 15_000,
  });

  const items = useMemo((): StaffHubSearchItem[] => {
    const seen = new Set<string>();
    return (query.data?.pages ?? []).flatMap((page) =>
      page.items.filter((item) => (seen.has(item.id) ? false : (seen.add(item.id), true))),
    );
  }, [query.data?.pages]);

  const total = query.data?.pages[0]?.total ?? items.length;
  return { query, items, total };
}
