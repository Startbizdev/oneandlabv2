/**
 * Affichage anonymisé pour pages publiques : prénom + initiale du nom (ex. « Marie D. »).
 * L’API publique (`/api/public/nurse|lab/[slug]`) envoie déjà ce format dans `patient_name`.
 */
export function formatReviewerNameForDisplay(fullName: string | null | undefined): string {
  const raw = String(fullName ?? '').trim();
  if (!raw) return 'Patient';
  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'Patient';
  if (parts.length === 1) return parts[0];
  const first = parts[0];
  const lastToken = parts[parts.length - 1];
  // Déjà « L. » ou « L » (format API)
  if (/^[A-Za-zÀ-ÖØ-öø-ÿ]\.?$/.test(lastToken)) {
    const li = lastToken.charAt(0).toUpperCase();
    return `${first} ${li}.`;
  }
  const lastInitial = lastToken.charAt(0).toUpperCase();
  return `${first} ${lastInitial}.`;
}
