/** La position ne sert qu'au calcul de l'ordre : elle n'entre pas dans la clé, sinon chaque variation GPS vide le cache. */
export const PRELEVEUR_TOUR_QUERY_ROOT = ['preleveur-tour'] as const;

export function preleveurTourQueryKey(date: string) {
  return [...PRELEVEUR_TOUR_QUERY_ROOT, date] as const;
}
