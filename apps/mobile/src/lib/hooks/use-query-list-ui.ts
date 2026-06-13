import type { UseQueryResult } from '@tanstack/react-query';

type QuerySlice<T> = Pick<
  UseQueryResult<T>,
  'isPending' | 'isFetching' | 'isLoading' | 'data' | 'isError' | 'isSuccess'
>;

/**
 * État UI liste — ne jamais remplacer toute la liste par un skeleton lors d’un refetch / poll.
 * Skeleton uniquement au premier chargement (aucune donnée en cache).
 */
export function useQueryListUi<T>(query: Pick<UseQueryResult<T>, 'isPending' | 'isFetching' | 'data'>) {
  const hasCachedData = query.data !== undefined;
  const showInitialPlaceholder = query.isPending && !hasCachedData;
  const showList = hasCachedData;
  const isBackgroundFetching = query.isFetching && hasCachedData && !showInitialPlaceholder;

  return {
    hasCachedData,
    showInitialPlaceholder,
    showList,
    isBackgroundFetching,
    isError: 'isError' in query ? Boolean(query.isError) : false,
    isSuccess: 'isSuccess' in query ? Boolean(query.isSuccess) : false,
  };
}
