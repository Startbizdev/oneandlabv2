import { useCallback, useRef } from 'react';

/**
 * Ferme la sheet puis lance l'action une fois la route native retirée (`onDismissed` de `SheetModal`) :
 * ouvrir une autre sheet, naviguer ou présenter une vue système pendant la fermeture casse la pile native.
 */
export function useAfterSheetDismiss(close: () => void) {
  const pendingRef = useRef<(() => void) | null>(null);

  const closeThen = useCallback(
    (action: () => void) => {
      pendingRef.current = action;
      close();
    },
    [close],
  );

  const onDismissed = useCallback(() => {
    const action = pendingRef.current;
    pendingRef.current = null;
    action?.();
  }, []);

  return { closeThen, onDismissed };
}
