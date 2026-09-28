import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { isAppStateForeground } from '@/lib/focused-refetch-interval';

/** true tant que l'application est au premier plan. */
export function useAppActive(): boolean {
  const [active, setActive] = useState(() => isAppStateForeground(AppState.currentState));
  useEffect(() => {
    setActive(isAppStateForeground(AppState.currentState));
    const sub = AppState.addEventListener('change', (next) => {
      setActive(isAppStateForeground(next));
    });
    return () => sub.remove();
  }, []);
  return active;
}
