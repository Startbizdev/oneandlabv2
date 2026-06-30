/**
 * Libellés durée pour une série de prélèvements (lab) : 2,3,5,7,10,15 jours ou personnalisé (custom + custom_days).
 * Ne pas confondre avec la « prise en charge » des soins infirmiers (voir getNursingDurationLabel).
 */
const BLOOD_TEST_SERIES_LABELS: Record<string, string> = {
  '2': '2 jours',
  '3': '3 jours',
  '5': '5 jours',
  '7': '7 jours',
  '10': '10 jours',
  '15': '15 jours',
};

export function formatBloodTestSeriesDurationDays(
  durationDays: string | null | undefined,
  customDays?: number | null
): string {
  const v = (durationDays ?? '').trim();
  if (!v) return '';
  if (v === 'custom') {
    if (customDays != null && customDays > 0) return `${customDays} jours`;
    return 'Durée personnalisée';
  }
  return BLOOD_TEST_SERIES_LABELS[v] || `${v} jours`;
}
