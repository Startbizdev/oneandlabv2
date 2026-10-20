/**
 * Routes accessibles quel que soit le rôle mobile connecté (`notifications` : redirection racine vers la stack du rôle).
 * `qr` et `pharmacie` : liens universels cary.bio qui aiguillent eux-mêmes vers l'écran du rôle.
 */
export const GLOBAL_SEGMENTS = new Set(['profile', 'notifications', 'qr', 'pharmacie']);

/** Route racine des sheets natives (`app/sheet/[id].tsx`) : elle recouvre l'écran courant, les gardes l'ignorent. */
export const SHEET_SEGMENT = 'sheet';

export function isSheetSegment(segments: readonly string[]): boolean {
  return segments[0] === SHEET_SEGMENT;
}
