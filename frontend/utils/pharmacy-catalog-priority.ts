import type { PharmacyCatalogItem } from '@oneandlab/shared-types';

export type PharmacyCatalogRow = PharmacyCatalogItem & {
  is_patient_pharmacy?: boolean;
};

export function splitPharmacyCatalog(
  items: PharmacyCatalogRow[],
  ownPharmacyId: string,
): { preferred: PharmacyCatalogRow[]; others: PharmacyCatalogRow[] } {
  const preferred: PharmacyCatalogRow[] = [];
  const others: PharmacyCatalogRow[] = [];
  for (const item of items) {
    if (item.is_patient_pharmacy === true || (ownPharmacyId !== '' && item.id === ownPharmacyId)) {
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
    },
    ...items,
  ];
}
