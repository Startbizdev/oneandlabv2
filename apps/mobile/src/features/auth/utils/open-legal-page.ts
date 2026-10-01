import { Linking } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { LEGAL_PAGES, type LegalPageDef } from '@/constants/legal-pages';
import { webAppUrl } from '@/config/env';

export type AuthLegalSlug = 'cgv' | 'confidentialite';

export function getLegalPage(slug: AuthLegalSlug): LegalPageDef | undefined {
  return LEGAL_PAGES.find((page) => page.slug === slug);
}

/**
 * Hors session, les routes `/(role)/web` ne sont pas accessibles : la page légale publique
 * s'ouvre dans le navigateur intégré, ou à défaut dans le navigateur système.
 */
export async function openLegalPage(slug: AuthLegalSlug): Promise<void> {
  const page = getLegalPage(slug);
  if (!page) return;
  const url = webAppUrl(page.path);
  try {
    await WebBrowser.openBrowserAsync(url);
  } catch {
    await Linking.openURL(url);
  }
}
