/**
 * Adresse RDV — aligné sur frontend/utils/address-display.ts + patient-address-rdv.ts
 */

export type ParsedPatientAddress = {
  label: string;
  lat?: number;
  lng?: number;
  complement?: string;
};

export function parseRawPatientAddress(raw: unknown): ParsedPatientAddress | null {
  if (raw == null) return null;
  if (typeof raw === 'string') {
    const t = raw.trim();
    if (!t) return null;
    try {
      const j = JSON.parse(t) as Record<string, unknown>;
      if (j && typeof j === 'object' && !Array.isArray(j)) {
        return {
          label: String(j.label ?? ''),
          lat: typeof j.lat === 'number' ? j.lat : undefined,
          lng: typeof j.lng === 'number' ? j.lng : undefined,
          complement: typeof j.complement === 'string' ? j.complement : undefined,
        };
      }
    } catch {
      return { label: t };
    }
    return { label: t };
  }
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    return {
      label: String(o.label ?? ''),
      lat: typeof o.lat === 'number' ? o.lat : undefined,
      lng: typeof o.lng === 'number' ? o.lng : undefined,
      complement: typeof o.complement === 'string' ? o.complement : undefined,
    };
  }
  return null;
}

export function labelFromAppointmentAddressField(raw: unknown): string {
  const p = parseRawPatientAddress(raw);
  return (p?.label ?? '').trim();
}

function formDataAddressStreet(raw: unknown): string {
  if (raw == null) return '';
  if (typeof raw === 'object' && !Array.isArray(raw)) {
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

function addressFirstSegmentHasLeadingHouseNumber(line: string): boolean {
  const seg = line.split(',')[0]?.trim() ?? '';
  return /^\d/.test(seg);
}

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
    address?: string | { label?: string; street?: string; postcode?: string; postal_code?: string; city?: string } | null;
    address_label?: string;
  } | null;
};

export function appointmentListAddressLine(apt: AppointmentLikeForAddress | null | undefined): string {
  if (!apt) return '';

  const fdAddr = apt.form_data?.address;
  const streetFromForm = formDataAddressStreet(fdAddr);

  let primary = labelFromAppointmentAddressField(apt.address);
  if (!primary) primary = labelFromAppointmentAddressField(fdAddr);
  if (!primary && apt.form_data?.address_label) {
    primary = String(apt.form_data.address_label).trim();
  }

  return mergeStreetIntoAddressDisplayLine(primary, streetFromForm);
}

function extractFrenchPostcodeFromLine(line: string): string | null {
  const m = /\b(\d{5})\b/.exec(line);
  return m ? m[1]! : null;
}

function formDataAddressPostcodeCity(fd: unknown): { postcode: string; city: string } | null {
  if (fd == null || typeof fd !== 'object' || Array.isArray(fd)) return null;
  const o = fd as { postcode?: unknown; postal_code?: unknown; city?: unknown };
  const raw = o.postcode ?? o.postal_code;
  const pc = typeof raw === 'string' ? raw.replace(/\s/g, '').trim() : '';
  if (!/^\d{5}$/.test(pc)) return null;
  const city = typeof o.city === 'string' ? o.city.trim() : '';
  return { postcode: pc, city };
}

/** Extrait le nom de ville depuis un libellé complet si absent de form_data. */
function extractCityFromAddressLine(full: string, postcode: string | null): string {
  if (!full) return '';
  const parts = full
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  const pc = (postcode || '').replace(/\D/g, '').slice(0, 5);
  if (pc) {
    for (const seg of parts) {
      if (seg.includes(pc)) {
        const rest = seg.replace(pc, '').trim().replace(/\bFrance\b/i, '').trim();
        if (rest && !/^\d/.test(rest)) return rest;
      }
    }
  }
  const last = parts[parts.length - 1] ?? '';
  if (last && !/^France$/i.test(last) && !/^\d{5}\b/.test(last) && !extractFrenchPostcodeFromLine(last)) {
    return last.replace(/\bFrance\b/i, '').trim();
  }
  return '';
}

/** Libellé d’arrondissement (Paris, Lyon, Marseille) à partir du code postal. */
export function frenchArrondissementLabelFromPostcode(postcode: string): string | null {
  const pc = (postcode || '').replace(/\D/g, '').slice(0, 5);
  if (pc.length !== 5) return null;
  if (pc.startsWith('75')) {
    const n = parseInt(pc.slice(3, 5), 10);
    if (n >= 1 && n <= 20) return n === 1 ? '1er arrondissement' : `${n}e arrondissement`;
    return null;
  }
  if (pc >= '69001' && pc <= '69009') {
    const n = parseInt(pc.slice(3, 5), 10);
    if (n >= 1 && n <= 9) return n === 1 ? '1er arrondissement' : `${n}e arrondissement`;
    return null;
  }
  if (pc >= '13001' && pc <= '13016') {
    const n = parseInt(pc.slice(3, 5), 10);
    if (n >= 1 && n <= 16) return n === 1 ? '1er arrondissement' : `${n}e arrondissement`;
    return null;
  }
  return null;
}

function stripLeadingHouseNumberFromLine(line: string): string {
  return (line || '').replace(/^\d+[a-zA-Zàâäéèêëïîôùûç\-]*\s+/u, '').trim();
}

/** Rue sans numéro + code postal + ville si connue (ex. « rue de la paix 75015 Paris »). */
export function formatStreetAndPostcodeOfferLine(
  streetLine: string,
  postcode: string | null | undefined,
  city?: string | null,
): string {
  const street = stripLeadingHouseNumberFromLine((streetLine || '').split(',')[0]?.trim() ?? '');
  const pc = (postcode || '').replace(/\D/g, '').slice(0, 5);
  let line = '';
  if (street && /^\d{5}$/.test(pc)) line = `${street} ${pc}`;
  else if (/^\d{5}$/.test(pc)) line = pc;
  else line = street;
  if (!line) return '';

  const cityTrim = (city || '').trim();
  if (/^75/.test(pc)) {
    if (!/\bParis\b/i.test(line)) line = `${line} Paris`;
    return line;
  }
  if (cityTrim && !line.toLowerCase().includes(cityTrim.toLowerCase())) {
    line = `${line} ${cityTrim}`;
  }
  return line;
}

/**
 * Modal offre (avant acceptation) : rue sans numéro + code postal + ville.
 * Ex. « rue de la paix 75015 Paris » ou « avenue Jean Jaurès 69003 Lyon ».
 */
export function appointmentOfferAddressLine(apt: AppointmentLikeForAddress | null | undefined): string {
  if (!apt) return '';

  const full = appointmentListAddressLine(apt).trim();
  const fdMeta = formDataAddressPostcodeCity(apt?.form_data?.address);
  const pc = extractFrenchPostcodeFromLine(full) ?? fdMeta?.postcode ?? null;
  const city = fdMeta?.city || extractCityFromAddressLine(full, pc) || '';

  const streetFromForm = formDataAddressStreet(apt?.form_data?.address);
  const streetSource =
    streetFromForm ||
    full.split(',')[0]?.trim() ||
    '';

  const line = formatStreetAndPostcodeOfferLine(streetSource, pc, city);
  if (line) return line;

  const parts = full
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length >= 2) {
    return formatStreetAndPostcodeOfferLine(parts[0], pc, city);
  }
  return '';
}

/** Ligne d’adresse pour listes et fiche détail RDV. */
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

/** Alias historique mobile — même logique que le détail web. */
export function appointmentAddressLine(apt: AppointmentLikeForAddress | null | undefined): string {
  return appointmentDetailAddressLine(apt);
}
