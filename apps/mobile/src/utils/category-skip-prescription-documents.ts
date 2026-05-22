export function normalizeCategorySkipPrescriptionDocuments(raw: unknown): boolean {
  if (raw === true || raw === 1) return true;
  if (raw === '1') return true;
  if (typeof raw === 'string' && raw.trim().toLowerCase() === 'true') return true;
  return false;
}
