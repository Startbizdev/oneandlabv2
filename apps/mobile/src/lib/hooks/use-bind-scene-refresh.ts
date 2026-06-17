import { useEffect } from 'react';
import { useScenePullRefreshSetter } from '@/components/ui/scene-pull-refresh-context';

/** Affiche l’indicateur sous le header glass quand une liste/query refresh sans useManualRefresh. */
export function useBindSceneRefresh(visible: boolean) {
  const setSceneRefresh = useScenePullRefreshSetter();

  useEffect(() => {
    setSceneRefresh(visible);
    return () => setSceneRefresh(false);
  }, [visible, setSceneRefresh]);
}
