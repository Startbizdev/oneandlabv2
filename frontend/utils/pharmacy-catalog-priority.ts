import type { PharmacyCatalogItem } from '@oneandlab/shared-types';

export type PharmacyCatalogRow = PharmacyCatalogItem & {
  is_patient_pharmacy?: boolean;
};

/** `pinnedPharmacyId` : pharmacie choisie via son QR code, affichée en tête des préférées. */
export function splitPharmacyCatalog(
  items: PharmacyCatalogRow[],
  ownPharmacyId: string,
  pinnedPharmacyId = '',
): { preferred: PharmacyCatalogRow[]; others: PharmacyCatalogRow[] } {
  const preferred: PharmacyCatalogRow[] = [];
  const others: PharmacyCatalogRow[] = [];
  for (const item of items) {
    if (pinnedPharmacyId !== '' && item.id === pinnedPharmacyId) {
      preferred.unshift(item);
    } else if (item.is_patient_pharmacy === true || (ownPharmacyId !== '' && item.id === ownPharmacyId)) {
      preferred.push(item);
    } else {
      others.push(item);
    }
  }
  return { preferred, others };
}

/** Le compte pharmacie reste choisissable même s'il est absent du catalogue filtré. */
export function withOwnPharmacyOption(
  items: PharmacyCatalogRow[],
  ownPharmacyId: string,
): PharmacyCatalogRow[] {
  if (ownPharmacyId === '' || items.some((item) => item.id === ownPharmacyId)) return items;
  return [
    {
      id: ownPharmacyId,
      display_name: 'Votre pharmacie',
      emploi: '',
      accepts_click_collect: true,
      accepts_home_delivery: true,
      click_collect_days: [],
      home_delivery_days: [],
      address: null,
      postal_code: '',
      profile_image_url: null,
    },
    ...items,
  ];
}

/** Jour ISO (1 = lundi … 7 = dimanche) d'une date `YYYY-MM-DD`, à midi pour éviter les décalages. */
function isoWeekday(date: string): number {
  return new Date(`${date}T12:00:00`).getDay() || 7;
}

/** La pharmacie prépare-t-elle ce jour-là pour ce mode ? Jours non renseignés : oui. */
export function pharmacyOpenOnDate(
  pharmacy: PharmacyCatalogItem,
  mode: 'click_collect' | 'home_delivery',
  date: string,
): boolean {
  const days = mode === 'home_delivery' ? pharmacy.home_delivery_days : pharmacy.click_collect_days;
  return !date || !days?.length || days.includes(isoWeekday(date));
}
