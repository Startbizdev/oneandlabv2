import { useCallback, useState } from 'react';
import { useScenePullRefreshSetter } from '@/components/ui/scene-pull-refresh-context';

const MIN_REFRESH_VISIBLE_MS = 450;

/**
 * RefreshControl découplé du polling / invalidateQueries :
 * le spinner n’apparaît que lors d’un pull-to-refresh explicite.
 */
export function useManualRefresh(refetch: () => Promise<unknown>) {
  const [refreshing, setRefreshing] = useState(false);
  const setSceneRefresh = useScenePullRefreshSetter();

  const onRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    setSceneRefresh(true);
    const started = Date.now();
    try {
      await refetch();
    } finally {
      const remaining = MIN_REFRESH_VISIBLE_MS - (Date.now() - started);
      if (remaining > 0) {
        await new Promise((resolve) => setTimeout(resolve, remaining));
      }
      setRefreshing(false);
      setSceneRefresh(false);
    }
  }, [refetch, refreshing, setSceneRefresh]);

  return { refreshing, onRefresh };
}
