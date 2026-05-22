/** Nom affiché (écran d’accueil, accessibilité, textes UI). */
export const APP_DISPLAY_NAME = 'Cary';

/** Identifiants stores — alignés avec `app.json` (iOS bundleIdentifier / Android package). */
export const APP_BUNDLE_ID = 'com.cary.mobile';

/** Schéma Expo Linking (`cary://…`). Garder aligné avec `app.json` → `scheme`. */
export const APP_URL_SCHEME = 'cary';

export function appDeepLink(path: string): string {
  const normalized = path.startsWith('/') ? path.slice(1) : path;
  return `${APP_URL_SCHEME}://${normalized}`;
}
