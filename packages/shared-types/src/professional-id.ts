export const PROFESSIONAL_ID_LABEL = 'RPPS ou Adeli';

export function normalizeProfessionalId(raw: string): string {
  return raw.replace(/\s/g, '');
}

/** Retourne un message d'erreur ou null si valide. */
export function validateProfessionalId(raw: string): string | null {
  const n = normalizeProfessionalId(raw);
  if (!n) return `Le numéro ${PROFESSIONAL_ID_LABEL} est obligatoire.`;
  if (!/^\d+$/.test(n)) return `Le numéro ${PROFESSIONAL_ID_LABEL} ne doit contenir que des chiffres.`;
  if (n.length === 9 || n.length === 11) return null;
  return 'Saisissez 9 chiffres (Adeli) ou 11 chiffres (RPPS).';
}

export function splitProfessionalId(raw: string): {
  rpps: string | null;
  adeli: string | null;
} {
  const n = normalizeProfessionalId(raw);
  if (n.length === 11) return { rpps: n, adeli: null };
  if (n.length === 9) return { rpps: null, adeli: n };
  return { rpps: null, adeli: null };
}

export function getProfessionalIdDisplay(
  rpps?: string | null,
  adeli?: string | null,
): string {
  return (rpps?.trim() || adeli?.trim() || '');
}

export function formatProfessionalIdWithKind(
  rpps?: string | null,
  adeli?: string | null,
): string | null {
  const r = rpps?.trim();
  if (r) return `RPPS ${r}`;
  const a = adeli?.trim();
  if (a) return `Adeli ${a}`;
  return null;
}
