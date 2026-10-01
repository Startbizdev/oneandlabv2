import { useCallback } from 'react';
import { useNavigationContainerRef, useRootNavigationState } from 'expo-router';

/**
 * Toute redirection lancée depuis le layout racine doit attendre le navigateur.
 * `ready` relance les effets au montage ; `canNavigate()` se lit au moment de l'appel, car au
 * redémarrage de l'activité Android les effets se reconnectent avant que le conteneur soit prêt.
 */
export function useNavigationReady(): { ready: boolean; canNavigate: () => boolean } {
  const ready = Boolean(useRootNavigationState()?.key);
  const navigationRef = useNavigationContainerRef();
  const canNavigate = useCallback(() => navigationRef.isReady(), [navigationRef]);
  return { ready, canNavigate };
}
