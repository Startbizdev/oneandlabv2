import { useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

/**
 * Détection réseau simplifiée sans nouvelle dépendance :
 * retry au retour au premier plan (pattern offline mobile).
 */
export function useAppForegroundRefetch(refetch: () => void) {
  const [lastActive, setLastActive] = useState<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (lastActive.match(/inactive|background/) && next === 'active') {
        refetch();
      }
      setLastActive(next);
    });
    return () => sub.remove();
  }, [lastActive, refetch]);
}
