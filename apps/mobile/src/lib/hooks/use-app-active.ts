import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/** true tant que l'application est au premier plan. */
export function useAppActive(): boolean {
  const [active, setActive] = useState(AppState.currentState === 'active');
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      setActive(next === 'active');
    });
    return () => sub.remove();
  }, []);
  return active;
}
