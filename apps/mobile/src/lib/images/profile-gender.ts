/** Genre profil (aligné GENDER_OPTIONS : male | female | other). */
export type ProfileGender = 'male' | 'female' | 'other';

export function normalizeProfileGender(raw?: string | null): ProfileGender | null {
  const g = String(raw ?? '').trim().toLowerCase();
  if (g === 'male' || g === 'm' || g === 'homme') return 'male';
  if (g === 'female' || g === 'f' || g === 'femme') return 'female';
  if (g === 'other' || g === 'autre' || g === 'non-binary' || g === 'non_binary') return 'other';
  return null;
}
