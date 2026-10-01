import { Linking, Platform } from 'react-native';
import type { QueryClient } from '@tanstack/react-query';
import { buildNavigationUrl, type NavigationTarget } from '@oneandlab/shared-utils';
import type { NavAppPref, NurseTourPayload } from '../api/nurse-tour.service';

const NAV_APP_PREFS: readonly NavAppPref[] = ['waze', 'google_maps', 'apple_maps', 'system'];

/** Défaut aligné sur la colonne `nav_app_pref` des plans de tournée (migrations 092 / 098). */
const DEFAULT_NAV_APP_PREF: NavAppPref = 'waze';

export function parseNavAppPref(raw: string | null | undefined): NavAppPref {
  return NAV_APP_PREFS.find((pref) => pref === raw) ?? DEFAULT_NAV_APP_PREF;
}

/** `system` : application de cartes native de la plateforme. */
function resolveNavApp(pref: NavAppPref): NavAppPref {
  if (pref !== 'system') return pref;
  return Platform.OS === 'ios' ? 'apple_maps' : 'google_maps';
}

export function buildTourNavigationUrl(pref: NavAppPref, target: NavigationTarget): string | null {
  return buildNavigationUrl(resolveNavApp(pref), target);
}

/** Ouvre l'itinéraire dans l'application choisie ; `false` si aucune adresse exploitable ou ouverture refusée. */
export async function openTourNavigation(pref: NavAppPref, target: NavigationTarget): Promise<boolean> {
  const url = buildTourNavigationUrl(pref, target);
  if (!url) return false;
  try {
    await Linking.openURL(url);
    return true;
  } catch (error) {
    if (__DEV__) console.warn('[tour] ouverture navigation impossible', url, error);
    return false;
  }
}

/** Préférence lue dans les tournées en cache (celle qui contient l'arrêt, sinon la première). */
export function cachedNurseNavAppPref(qc: QueryClient, stopId?: string | null): NavAppPref {
  const tours = qc
    .getQueriesData<NurseTourPayload>({ queryKey: ['nurse-tour'] })
    .map(([, data]) => data)
    .filter((data): data is NurseTourPayload => Boolean(data?.plan));
  const owner = stopId ? tours.find((t) => t.stops.some((s) => s.stop_id === stopId)) : undefined;
  return parseNavAppPref((owner ?? tours[0])?.plan.nav_app_pref);
}
