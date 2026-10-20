import type {
  PharmacyCatalogItem,
  PharmacyFulfillmentMode,
  PharmacyPublicProfile,
} from '@oneandlab/shared-types';

/**
 * Pharmacie imposée par un QR code (`pharmacy_id` de l'assistant) : elle reste en tête et sélectionnée,
 * même quand la liste se limite aux pharmacies du patient ou que le code postal l'exclurait.
 */
export function catalogItemFromPharmacyProfile(profile: PharmacyPublicProfile): PharmacyCatalogItem {
  return {
    id: profile.id,
    display_name: profile.display_name,
    emploi: profile.emploi,
    accepts_click_collect: profile.accepts_click_collect,
    accepts_home_delivery: profile.accepts_home_delivery,
    click_collect_days: profile.click_collect_days ?? [],
    home_delivery_days: profile.home_delivery_days ?? [],
    address: profile.address,
    postal_code: profile.postal_code,
    profile_image_url: profile.profile_image_url,
  };
}

export function pharmacyAcceptsMode(pharmacy: PharmacyCatalogItem, mode: PharmacyFulfillmentMode): boolean {
  return mode === 'home_delivery' ? pharmacy.accepts_home_delivery : pharmacy.accepts_click_collect;
}

/** Jour ISO (1 = lundi … 7 = dimanche) d'une date `YYYY-MM-DD`, midi local pour éviter les décalages. */
function isoWeekday(date: string): number {
  return new Date(`${date}T12:00:00`).getDay() || 7;
}

export function pharmacyOpenOnDate(
  pharmacy: PharmacyCatalogItem,
  mode: PharmacyFulfillmentMode,
  date: string,
): boolean {
  const days = mode === 'home_delivery' ? pharmacy.home_delivery_days : pharmacy.click_collect_days;
  return !date || !days?.length || days.includes(isoWeekday(date));
}

/** Explication affichée quand le mode ou la date choisis ne conviennent pas à la pharmacie du QR. */
export function preselectedPharmacyIssue(
  pharmacy: PharmacyCatalogItem | null | undefined,
  mode: PharmacyFulfillmentMode,
  date: string,
): { kind: 'mode' | 'date'; message: string } | null {
  if (!pharmacy) return null;
  const name = pharmacy.display_name?.trim() || 'Cette pharmacie';
  if (!pharmacyAcceptsMode(pharmacy, mode)) {
    return {
      kind: 'mode',
      message:
        mode === 'home_delivery'
          ? `${name} ne propose pas la livraison à domicile.`
          : `${name} ne propose pas le retrait en pharmacie.`,
    };
  }
  if (!pharmacyOpenOnDate(pharmacy, mode, date)) {
    return { kind: 'date', message: `${name} n’est pas disponible à cette date : choisissez un autre jour.` };
  }
  return null;
}

/** Mode proposé à l'ouverture : le retrait si la pharmacie l'accepte, sinon la livraison. */
export function initialModeForPharmacy(
  pharmacy: PharmacyCatalogItem,
  current: PharmacyFulfillmentMode,
): PharmacyFulfillmentMode {
  if (pharmacyAcceptsMode(pharmacy, current)) return current;
  if (pharmacy.accepts_click_collect) return 'click_collect';
  if (pharmacy.accepts_home_delivery) return 'home_delivery';
  return current;
}

/** Catalogue trié : pharmacie du QR, puis pharmacies du patient, favoris, ordre alphabétique. */
export function sortWizardCatalog(
  items: readonly PharmacyCatalogItem[],
  favorites: ReadonlySet<string>,
  preselected: PharmacyCatalogItem | null,
  mode: PharmacyFulfillmentMode,
): PharmacyCatalogItem[] {
  const merged = [...items];
  // Le serveur l'inclut via `include_id` ; le profil chargé à part couvre une réponse sans elle.
  if (preselected && pharmacyAcceptsMode(preselected, mode) && !merged.some((p) => p.id === preselected.id)) {
    merged.push(preselected);
  }
  const preselectedId = preselected?.id ?? null;
  return merged.sort((a, b) => {
    const aq = a.id === preselectedId ? 0 : 1;
    const bq = b.id === preselectedId ? 0 : 1;
    if (aq !== bq) return aq - bq;
    const ap = a.is_patient_pharmacy ? 0 : 1;
    const bp = b.is_patient_pharmacy ? 0 : 1;
    if (ap !== bp) return ap - bp;
    const af = favorites.has(a.id) ? 1 : 0;
    const bf = favorites.has(b.id) ? 1 : 0;
    if (af !== bf) return bf - af;
    return a.display_name.localeCompare(b.display_name, 'fr');
  });
}

/** Liste visible repliée : pharmacies du patient et pharmacie du QR ; tout le catalogue sinon. */
export function visibleWizardCatalog(
  sorted: readonly PharmacyCatalogItem[],
  showAll: boolean,
  preselectedId: string | null,
): PharmacyCatalogItem[] {
  const pinned = sorted.filter((p) => p.is_patient_pharmacy || p.id === preselectedId);
  const hasPatientPharmacy = sorted.some((p) => p.is_patient_pharmacy);
  return hasPatientPharmacy && !showAll ? pinned : [...sorted];
}
