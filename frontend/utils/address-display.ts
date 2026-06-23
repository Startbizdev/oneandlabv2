import { parseRawPatientAddress } from '~/utils/patient-address-rdv';

/**
 * Libellé d’affichage pour un champ adresse brut (objet API, chaîne libre ou JSON stringifié).
 */
export function labelFromAppointmentAddressField(raw: unknown): string {
  const p = parseRawPatientAddress(raw);
  return (p?.label ?? '').trim();
}

function formDataAddressStreet(raw: unknown): string {
  if (raw == null) return '';
  if (typeof raw === 'object' && !Array.isArray(raw) && raw !== null) {
    const s = (raw as { street?: string }).street;
    return typeof s === 'string' ? s.trim() : '';
  }
  if (typeof raw === 'string') {
    const t = raw.trim();
    if (!t.startsWith('{')) return '';
    try {
      const j = JSON.parse(t) as { street?: string };
      return typeof j.street === 'string' ? j.street.trim() : '';
    } catch {
      return '';
    }
  }
  return '';
}

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
  form_data?: {
    address?: string | { label?: string; street?: string; postcode?: string; city?: string } | null;
  } | null;
};

function extractFrenchPostcodeFromLine(line: string): string | null {
  const m = /\b(\d{5})\b/.exec(line);
  return m ? m[1]! : null;
}

function formDataAddressPostcodeCity(fd: unknown): { postcode: string; city: string } | null {
  if (fd == null || typeof fd !== 'object' || Array.isArray(fd)) return null;
  const o = fd as { postcode?: unknown; city?: unknown };
  const raw = o.postcode;
  const pc = typeof raw === 'string' ? raw.replace(/\s/g, '').trim() : '';
  if (!/^\d{5}$/.test(pc)) return null;
  const city = typeof o.city === 'string' ? o.city.trim() : '';
  return { postcode: pc, city };
}


/**
 * Ligne d’adresse pour listes (infirmier « Mes demandes », etc.) : `address` déchiffrée + enrichissement `form_data.address.street`.
 */
export function appointmentListAddressLine(apt: AppointmentLikeForAddress | null | undefined): string {
  if (!apt) return '';

  const fdAddr = apt.form_data?.address;
  const streetFromForm = formDataAddressStreet(fdAddr);

  let primary = labelFromAppointmentAddressField(apt.address);
  if (!primary) primary = labelFromAppointmentAddressField(fdAddr);

  return mergeStreetIntoAddressDisplayLine(primary, streetFromForm);
}

/**
 * Ligne d’adresse pour la fiche RDV : liste + code postal/ville issus de `form_data.address` si absents du libellé.
 * On n’ajoute pas « 1er / 7e arrondissement » après le CP : à Paris, Lyon et Marseille le code postal (75007, 13007…)
 * identifie déjà l’arrondissement et le répéter alourdit l’affichage.
 */
export function appointmentDetailAddressLine(apt: AppointmentLikeForAddress | null | undefined): string {
  let line = appointmentListAddressLine(apt).trim();
  if (!line) return '';

  let pc = extractFrenchPostcodeFromLine(line);
  const fdMeta = formDataAddressPostcodeCity(apt?.form_data?.address);
  if (!pc && fdMeta) {
    pc = fdMeta.postcode;
    const city = fdMeta.city;
    const alreadyHasCity = city ? line.includes(city) : true;
    line = `${line}, ${pc}${!alreadyHasCity && city ? ` ${city}` : ''}`;
  }

  return line;
}

export { appointmentOfferAddressLine, frenchArrondissementLabelFromPostcode } from '@oneandlab/shared-utils';
