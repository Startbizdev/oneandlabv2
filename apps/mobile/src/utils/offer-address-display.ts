import { formatStreetAndPostcodeOfferLine } from '@oneandlab/shared-utils';

function extractFrenchPostcodeFromLine(line: string): string | null {
  const m = /\b(\d{5})\b/.exec(line);
  return m ? m[1]! : null;
}

/**
 * Adresse affichée avant acceptation (sans numéro de rue) — aligné web `formatStreetAndDistrictWithoutStreetNumber`.
 */
export function formatStreetAndDistrictWithoutStreetNumber(
  address: string | null | undefined,
): string {
  if (!address || typeof address !== 'string') return '';
  const trimmed = address.trim();
  if (!trimmed) return '';
  const pc = extractFrenchPostcodeFromLine(trimmed);
  const streetPart = trimmed.split(',')[0]?.trim() ?? '';
  return formatStreetAndPostcodeOfferLine(streetPart, pc) || streetPart;
}
