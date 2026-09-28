/**
 * Intervalle React Query uniquement quand l'app est au premier plan.
 * Pour les requêtes globales (cloche, rafraîchissement RDV) montées hors écran : pas de notion de focus.
 */
export function foregroundRefetchInterval(intervalMs: number, appStateActive: boolean): number | false {
  return appStateActive ? intervalMs : false;
}

/**
 * Intervalle React Query uniquement quand l'écran est focus et l'app active.
 * Évite le polling en arrière-plan (batterie + charge API).
 */
export function focusedRefetchInterval(
  intervalMs: number,
  isFocused: boolean,
  appStateActive = true,
): number | false {
  if (!isFocused) return false;
  return foregroundRefetchInterval(intervalMs, appStateActive);
}

/**
 * `AppState.currentState` peut valoir `unknown` / null au démarrage sans événement `change` ensuite :
 * seul un état explicitement hors premier plan coupe le polling.
 */
export function isAppStateForeground(state: string | null | undefined): boolean {
  return state !== 'background' && state !== 'inactive';
}
