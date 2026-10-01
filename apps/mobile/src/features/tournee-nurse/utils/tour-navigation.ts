import { Linking, Platform } from 'react-native';
import type { QueryClient } from '@tanstack/react-query';
import { buildNavigationUrl, type NavigationTarget } from '@oneandlab/shared-utils';
import type { NavAppPref, NurseTourPayload } from '../api/nurse-tour.service';
import type { PreleveurTourPayload } from '@/features/tournee-preleveur/api/preleveur-tour.service';

const NAV_APP_PREFS: readonly NavAppPref[] = ['waze', 'google_maps', 'apple_maps', 'system'];

/** Défaut aligné sur la colonne `nav_app_pref` des plans de tournée (migrations 092 / 098). */
const DEFAULT_NAV_APP_PREF: NavAppPref = 'waze';

const NURSE_TOUR_QUERY_ROOT = 'nurse-tour';
const PRELEVEUR_TOUR_QUERY_ROOT = 'preleveur-tour';

/** Seuls les plans de tournée infirmier et préleveur portent `nav_app_pref`. */
function tourQueryRootForRole(role: string | null | undefined): string | null {
  if (role === 'nurse') return NURSE_TOUR_QUERY_ROOT;
  if (role === 'preleveur') return PRELEVEUR_TOUR_QUERY_ROOT;
  return null;
}

const NAV_APP_LABELS: Record<Exclude<NavAppPref, 'system'>, string> = {
  waze: 'Waze',
  google_maps: 'Google Maps',
  apple_maps: 'Plans',
};

export function parseNavAppPref(raw: string | null | undefined): NavAppPref {
  return NAV_APP_PREFS.find((pref) => pref === raw) ?? DEFAULT_NAV_APP_PREF;
}

/** `system` : application de cartes native de la plateforme. */
function resolveNavApp(pref: NavAppPref): Exclude<NavAppPref, 'system'> {
  if (pref !== 'system') return pref;
  return Platform.OS === 'ios' ? 'apple_maps' : 'google_maps';
}

export function navAppLabel(pref: NavAppPref): string {
  return NAV_APP_LABELS[resolveNavApp(pref)];
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

type CachedTour = NurseTourPayload | PreleveurTourPayload;

/** Préférence lue dans les tournées en cache (celle qui contient l'arrêt ou le RDV, sinon la première). */
function cachedTourNavAppPref(
  qc: QueryClient,
  queryRoot: string,
  match: (stop: CachedTour['stops'][number]) => boolean,
): NavAppPref {
  const tours = qc
    .getQueriesData<CachedTour>({ queryKey: [queryRoot] })
    .map(([, data]) => data)
    .filter((data): data is CachedTour => Boolean(data?.plan));
  const owner = tours.find((t) => t.stops.some(match));
  return parseNavAppPref((owner ?? tours[0])?.plan.nav_app_pref);
}

export function cachedNurseNavAppPref(qc: QueryClient, stopId?: string | null): NavAppPref {
  return cachedTourNavAppPref(qc, NURSE_TOUR_QUERY_ROOT, (s) => Boolean(stopId) && s.stop_id === stopId);
}

/**
 * Préférence du rôle connecté (infirmier, préleveur) ; `null` pour les rôles sans plan de tournée,
 * qui gardent leur ouverture d'itinéraire habituelle.
 */
export function cachedNavAppPrefForRole(
  qc: QueryClient,
  role: string | null | undefined,
  appointmentId?: string | null,
): NavAppPref | null {
  const queryRoot = tourQueryRootForRole(role);
  if (!queryRoot) return null;
  return cachedTourNavAppPref(
    qc,
    queryRoot,
    (s) => Boolean(appointmentId) && String(s.appointment_id) === String(appointmentId),
  );
}
