/**
 * Affichage court avec arrondissement pour Paris (75xxx) à partir d'une ligne d'adresse libre.
 */
export function formatAddressWithArrondissement(address: string | null | undefined): string {
  if (!address || typeof address !== 'string') return '';
  const trimmed = address.trim();
  if (!trimmed) return '';

  const postalCodeMatch = trimmed.match(/(\d{5})\s+([^,]+)/);
  if (postalCodeMatch) {
    const postalCode = postalCodeMatch[1];
    const city = postalCodeMatch[2].trim();
    if (postalCode.startsWith('75')) {
      const arrondissement = postalCode.substring(3, 5);
      return `${arrondissement}ème arrondissement, Paris`;
    }
    return `${postalCode} ${city}`;
  }

  const parts = trimmed.split(',').map((p) => p.trim());
  if (parts.length > 0) {
    return parts[parts.length - 1];
  }
  return trimmed;
}

/**
 * Rue + arrondissement (Paris) ou ville, sans numéro de rue — pour partage / modal avant acceptation.
 */
export function formatStreetAndDistrictWithoutStreetNumber(address: string | null | undefined): string {
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
    return `${streetLine}, ${parts.slice(1).join(', ')}`;
  }
  return streetLine;
}

/**
 * Indique si le premier segment (avant la première « , ») commence par un n° de rue (12, 12bis…).
 */
export function addressFirstSegmentHasLeadingHouseNumber(line: string): boolean {
  const seg = line.split(',')[0]?.trim() ?? '';
  return /^\d/.test(seg);
}

/**
 * Le libellé stocké côté RDV peut être « Rue X, CP Ville » sans numéro alors que `form_data.address.street`
 * contient « 12 Rue X » (Google/BAN). Recompose une ligne complète pour cartes pro / trajet.
 */
export function mergeStreetIntoAddressDisplayLine(primary: string, street: string): string {
  const p = (primary || '').trim();
  const s = (street || '').trim();
  if (!p) return s;
  if (!s) return p;
  if (addressFirstSegmentHasLeadingHouseNumber(p)) return p;
  if (!addressFirstSegmentHasLeadingHouseNumber(s)) return p;

  const commaIdx = p.indexOf(',');
  if (commaIdx !== -1) {
    const rest = p.slice(commaIdx + 1).trim();
    return rest ? `${s}, ${rest}` : s;
  }

  return s;
}

type AppointmentLikeForAddress = {
  address?: string | { label?: string } | null;
  form_data?: { address?: string | { label?: string; street?: string } | null } | null;
};

/**
 * Ligne d’adresse pour listes (infirmier « Mes demandes », etc.) : `address` déchiffrée + enrichissement `form_data.address.street`.
 */
export function appointmentListAddressLine(apt: AppointmentLikeForAddress | null | undefined): string {
  if (!apt) return '';

  const fdAddr = apt.form_data?.address;
  const streetFromForm =
    fdAddr && typeof fdAddr === 'object' && typeof (fdAddr as { street?: string }).street === 'string'
      ? (fdAddr as { street: string }).street.trim()
      : '';

  let primary = '';
  const root = apt.address;
  if (typeof root === 'string') primary = root.trim();
  else if (root && typeof root === 'object' && typeof (root as { label?: string }).label === 'string') {
    primary = String((root as { label: string }).label).trim();
  }

  if (!primary && fdAddr) {
    if (typeof fdAddr === 'string') primary = fdAddr.trim();
    else if (typeof fdAddr === 'object' && typeof (fdAddr as { label?: string }).label === 'string') {
      primary = String((fdAddr as { label: string }).label).trim();
    }
  }

  return mergeStreetIntoAddressDisplayLine(primary, streetFromForm);
}
