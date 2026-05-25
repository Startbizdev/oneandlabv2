import { useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { FOREGROUND_REFETCH_MIN_AGE_MS } from '@oneandlab/shared-constants';

/**
 * Refetch au retour au premier plan seulement si les données sont plus vieilles que minAgeMs.
 */
export function useStaleForegroundRefetch(
  refetch: () => void,
  dataUpdatedAt: number | undefined,
  minAgeMs = FOREGROUND_REFETCH_MIN_AGE_MS,
) {
  const [lastActive, setLastActive] = useState<AppStateStatus>(AppState.currentState);
  const dataUpdatedAtRef = useRef(dataUpdatedAt);
  dataUpdatedAtRef.current = dataUpdatedAt;

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (lastActive.match(/inactive|background/) && next === 'active') {
        const updated = dataUpdatedAtRef.current ?? 0;
        if (updated === 0 || Date.now() - updated >= minAgeMs) {
          refetch();
        }
      }
      setLastActive(next);
    });
    return () => sub.remove();
  }, [lastActive, refetch, minAgeMs]);
}
