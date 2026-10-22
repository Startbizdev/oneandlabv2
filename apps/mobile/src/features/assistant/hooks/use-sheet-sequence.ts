import { useCallback, useRef, useState } from 'react';

/**
 * Une seule sheet native à la fois : `closeThen` ferme la sheet ouverte et n'enchaîne (autre sheet,
 * navigation) qu'une fois sa fermeture terminée (`onDismissed`).
 */
export function useSheetSequence<T>() {
  const [state, setState] = useState<{ sheet: T | null; open: boolean }>({ sheet: null, open: false });
  const nextRef = useRef<T | (() => void) | null>(null);

  const open = useCallback((sheet: T) => setState({ sheet, open: true }), []);

  const closeThen = useCallback((next: T | (() => void) | null = null) => {
    nextRef.current = next;
    setState((s) => ({ ...s, open: false }));
  }, []);

  const onDismissed = useCallback(() => {
    const next = nextRef.current;
    nextRef.current = null;
    if (typeof next === 'function') {
      setState({ sheet: null, open: false });
      (next as () => void)();
    } else {
      setState(next ? { sheet: next, open: true } : { sheet: null, open: false });
    }
  }, []);

  return { sheet: state.sheet, isOpen: state.open, open, closeThen, onDismissed };
}
