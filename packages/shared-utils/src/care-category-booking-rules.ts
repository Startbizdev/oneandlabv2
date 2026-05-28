/** Catégories sans modal / champs d’options à la réservation (soin fixe, passage unique). */
const CARE_CATEGORY_NAMES_WITHOUT_BOOKING_OPTIONS = new Set([
  'certificat de décès',
  'certificat de deces',
]);

/** Réservées au staff — masquées aux patients (liste RDV, prise de RDV). */
const STAFF_ONLY_CARE_CATEGORY_NAMES = new Set(['certificat de deces']);

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

/** Certificat de décès et autres actes staff-only — jamais proposés / affichés aux patients. */
export function isStaffOnlyCareCategory(cat: {
  name?: string | null;
  label?: string | null;
}): boolean {
  const norm = normalizeCareCategoryName(cat.name ?? cat.label);
  if (!norm) return false;
  if (STAFF_ONLY_CARE_CATEGORY_NAMES.has(norm)) return true;
  return /certificat\s+(de\s+)?deces/.test(norm);
}

export function filterStaffOnlyCareCategoriesForPatient<T extends { name?: string | null; label?: string | null }>(
  categories: readonly T[],
): T[] {
  return categories.filter((cat) => !isStaffOnlyCareCategory(cat));
}

export function filterRdvCatalogLinesForPatientViewer<T extends { label?: string | null }>(
  lines: readonly T[],
): T[] {
  return lines.filter((line) => !isStaffOnlyCareCategory({ label: line.label, name: line.label }));
}
