/** Catégories sans modal / champs d’options à la réservation (soin fixe, passage unique). */
const CARE_CATEGORY_NAMES_WITHOUT_BOOKING_OPTIONS = new Set([
  'certificat de décès',
  'certificat de deces',
]);

function normalizeCareCategoryName(name: string | null | undefined): string {
  return String(name ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

/** Pas de bottom sheet / options catalogue : ajout direct au panier (prise en charge = 1 passage). */
export function isCareCategoryWithoutBookingOptions(cat: {
  name?: string | null;
  label?: string | null;
}): boolean {
  const norm = normalizeCareCategoryName(cat.name ?? cat.label);
  if (!norm) return false;
  return CARE_CATEGORY_NAMES_WITHOUT_BOOKING_OPTIONS.has(norm);
}
