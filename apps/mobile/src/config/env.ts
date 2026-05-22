import { Platform } from 'react-native';
import Constants from 'expo-constants';

/** Même API que buildlocaloneandlab.sh → NUXT_PUBLIC_API_BASE */
export const PRODUCTION_API_BASE = 'https://app.oneandlab.fr/api';

const LOCAL_API_PORT = 8888;

function resolveDevHost(): string {
  const hostUri =
    Constants.expoConfig?.hostUri ??
    Constants.linkingUri?.replace(/^exp:\/\//, '').split('/')[0];

  if (hostUri) {
    const host = hostUri.split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return host;
    }
  }

  if (Platform.OS === 'android') {
    return '10.0.2.2';
  }
  return '127.0.0.1';
}

function rewriteLocalhost(url: string): string {
  if (!url.includes('localhost') && !url.includes('127.0.0.1')) {
    return url;
  }
  const host = resolveDevHost();
  return url.replace(/\/\/localhost\b/g, `//${host}`).replace(/\/\/127\.0\.0\.1\b/g, `//${host}`);
}

export function getApiBase(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE?.trim();
  if (fromEnv) {
    return __DEV__ ? rewriteLocalhost(fromEnv) : fromEnv;
  }
  return PRODUCTION_API_BASE;
}

export function isDevBuild(): boolean {
  return __DEV__;
}

export function isProductionApi(): boolean {
  return getApiBase().startsWith('https://app.oneandlab.fr');
}

/** Origine du site Nuxt (sans `/api`) — WebViews abonnement, pages légales, etc. */
export function getWebAppBase(): string {
  const fromEnv = process.env.EXPO_PUBLIC_WEB_BASE?.trim();
  if (fromEnv) {
    return __DEV__ ? rewriteLocalhost(fromEnv.replace(/\/$/, '')) : fromEnv.replace(/\/$/, '');
  }
  const api = getApiBase().replace(/\/$/, '');
  return api.replace(/\/api$/i, '') || 'https://app.oneandlab.fr';
}

export function webAppUrl(path: string): string {
  const base = getWebAppBase();
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}
