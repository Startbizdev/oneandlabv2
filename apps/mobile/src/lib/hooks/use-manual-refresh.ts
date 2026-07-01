import { useCallback, useState } from 'react';

const MIN_REFRESH_VISIBLE_MS = 450;

/**
 * RefreshControl découplé du polling / invalidateQueries :
 * le spinner n’apparaît que lors d’un pull-to-refresh explicite.
 *
 * N’active pas l’indicateur pill du TabScreenFrame — cumuler les deux
 * provoque un double spinner (pill sous le header + natif dans la liste).
 */
export function useManualRefresh(refetch: () => Promise<unknown>) {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    const started = Date.now();
    try {
      await refetch();
    } finally {
      const remaining = MIN_REFRESH_VISIBLE_MS - (Date.now() - started);
      if (remaining > 0) {
        await new Promise((resolve) => setTimeout(resolve, remaining));
      }
      setRefreshing(false);
    }
  }, [refetch, refreshing]);

  return { refreshing, onRefresh };
}
