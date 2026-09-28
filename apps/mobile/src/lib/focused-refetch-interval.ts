/**
 * Intervalle React Query uniquement quand l'écran est focus et l'app active.
 * Évite le polling en arrière-plan (batterie + charge API).
 */
export function focusedRefetchInterval(
  intervalMs: number,
  isFocused: boolean,
  appStateActive = true,
): number | false {
  if (!isFocused || !appStateActive) return false;
  return intervalMs;
}
