import type { Href } from 'expo-router';
import { legalPageBySlug } from '@/constants/legal-pages';
import type { RoleRoutePrefix } from '@/navigation/role-route-prefix';
import { nursePublicProfilePath } from '@/features/profile/utils/nurse-public-profile';

/** Pages web Cary ouvrables dans la WebView `/(rôle)/web` — jamais un chemin libre. */
export type WebPageTarget = { kind: 'legal'; slug: string } | { kind: 'nurse-profile'; slug: string };

export type ResolvedWebPage = { path: string; title: string };

export function webPageHref(prefix: RoleRoutePrefix, target: WebPageTarget): Href {
  const params = { page: target.kind, slug: target.slug };
  switch (prefix) {
    case '/(pro)':
      return { pathname: '/(pro)/web', params };
    case '/(preleveur)':
      return { pathname: '/(preleveur)/web', params };
    case '/(patient)':
      return { pathname: '/(patient)/web', params };
    case '/(nurse)':
      return { pathname: '/(nurse)/web', params };
  }
}

/** Paramètres de route → page Nuxt publique existante, ou `null` si inconnue. */
export function resolveWebPage(page: string | undefined, slug: string | undefined): ResolvedWebPage | null {
  const s = slug?.trim();
  if (!s) return null;
  if (page === 'legal') {
    const legal = legalPageBySlug(s);
    return legal ? { path: legal.path, title: legal.label } : null;
  }
  if (page === 'nurse-profile') {
    return { path: nursePublicProfilePath(encodeURIComponent(s)), title: 'Mon profil public' };
  }
  return null;
}
