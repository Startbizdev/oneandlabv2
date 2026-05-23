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
    address?: string | { label?: string; street?: string; postcode?: string; city?: string } | null;
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
  const o = fd as { postcode?: unknown; city?: unknown };
  const raw = o.postcode;
  const pc = typeof raw === 'string' ? raw.replace(/\s/g, '').trim() : '';
  if (!/^\d{5}$/.test(pc)) return null;
  const city = typeof o.city === 'string' ? o.city.trim() : '';
  return { postcode: pc, city };
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
