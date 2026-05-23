/**
 * `care_categories.skip_prescription_documents` (PDO / json) : peut arriver comme
 * `true`, `1`, `"1"`, `"true"` — éviter les comparaisons `=== true` côté Vue.
 */
export function normalizeCategorySkipPrescriptionDocuments(raw: unknown): boolean {
  if (raw === true || raw === 1) return true;
  if (raw === '1') return true;
  if (typeof raw === 'string' && raw.trim().toLowerCase() === 'true') return true;
  return false;
}
