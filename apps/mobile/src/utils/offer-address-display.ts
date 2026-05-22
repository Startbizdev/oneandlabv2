/**
 * Adresse affichée avant acceptation (sans numéro de rue) — aligné web `formatStreetAndDistrictWithoutStreetNumber`.
 */
export function formatStreetAndDistrictWithoutStreetNumber(
  address: string | null | undefined,
): string {
  if (!address || typeof address !== 'string') return '';
  const trimmed = address.trim();
  if (!trimmed) return '';

  const postalMatch = trimmed.match(/\b(75\d{3})\b/);
  const parisArr =
    postalMatch && postalMatch[1].startsWith('75')
      ? parseInt(postalMatch[1].substring(3, 5), 10)
      : null;

  let rest = trimmed.replace(/^\d+[a-zA-Zàâäéèêëïîôùûç\-]*\s+/u, '').trim();
  const parts = rest
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return trimmed;

  const streetLine = parts[0];
  if (parisArr !== null && !Number.isNaN(parisArr)) {
    const arrLabel = parisArr === 1 ? '1er arrondissement' : `${parisArr}e arrondissement`;
    return `${streetLine}, ${arrLabel}, Paris`;
  }

  if (parts.length >= 2) {
    return `${streetLine}, ${parts[parts.length - 1]}`;
  }
  return streetLine;
}
