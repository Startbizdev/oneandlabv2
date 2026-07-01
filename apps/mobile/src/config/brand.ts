/** Nom affiché (écran d’accueil, accessibilité, textes UI). */
export const APP_DISPLAY_NAME = 'Cary';

/** Identifiants stores — alignés avec `app.json` (iOS bundleIdentifier / Android package). */
export const APP_BUNDLE_ID = 'com.carybioapp.app';

/** App Store Connect — Cary iOS */
export const IOS_APP_STORE_ID = '6778805884';
export const IOS_APP_STORE_URL = `https://apps.apple.com/app/id${IOS_APP_STORE_ID}`;
export const ANDROID_PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${APP_BUNDLE_ID}`;

/** Page d’accueil — fallback si ouverture store impossible */
export const APP_DOWNLOAD_FALLBACK_URL = 'https://cary.bio';

/** Schéma Expo Linking (`cary://…`). Garder aligné avec `app.json` → `scheme`. */
export const APP_URL_SCHEME = 'cary';

export function appDeepLink(path: string): string {
  const normalized = path.startsWith('/') ? path.slice(1) : path;
  return `${APP_URL_SCHEME}://${normalized}`;
}
