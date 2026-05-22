import { useCallback, useState } from 'react';

/**
 * RefreshControl découplé du polling / invalidateQueries :
 * le spinner n’apparaît que lors d’un pull-to-refresh explicite.
 */
export function useManualRefresh(refetch: () => Promise<unknown>) {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch, refreshing]);

  return { refreshing, onRefresh };
}
