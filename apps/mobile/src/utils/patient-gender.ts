/** Normalise genre patient/proche vers male | female | other | ''. */
export function normalizePatientGender(raw?: string | null): string {
  const g = String(raw ?? '').trim().toLowerCase();
  if (!g) return '';
  if (g === 'm' || g === 'male' || g === 'homme' || g === 'h') return 'male';
  if (g === 'f' || g === 'female' || g === 'femme') return 'female';
  if (g === 'other' || g === 'autre') return 'other';
  return g;
}

export function patientGenderIsSet(raw?: string | null): boolean {
  return normalizePatientGender(raw) !== '';
}
