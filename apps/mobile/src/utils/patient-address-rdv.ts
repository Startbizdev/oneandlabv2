import { searchAddresses } from '@/features/address/api/address.service';

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

/** Adresse formulaire RDV (coords BAN si manquantes). Aligné web `resolvePatientAddressForRdvForm`. */
export async function resolvePatientAddressForRdvForm(
  raw: unknown,
): Promise<{ label: string; lat: number; lng: number; complement?: string } | null> {
  const parsed = parseRawPatientAddress(raw);
  if (!parsed?.label?.trim()) return null;
  const label = parsed.label.trim();
  let lat =
    typeof parsed.lat === 'number' && Number.isFinite(parsed.lat) ? parsed.lat : NaN;
  let lng =
    typeof parsed.lng === 'number' && Number.isFinite(parsed.lng) ? parsed.lng : NaN;
  if (!Number.isFinite(lat)) lat = parseFloat(String((parsed as ParsedPatientAddress & { lat?: unknown }).lat ?? ''));
  if (!Number.isFinite(lng)) lng = parseFloat(String((parsed as ParsedPatientAddress & { lng?: unknown }).lng ?? ''));

  const coordsMissing =
    !Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0);

  if (coordsMissing && label.length >= 3) {
    try {
      const res = await searchAddresses(label, 1);
      const first = res.success && res.data?.[0] ? res.data[0] : null;
      if (first?.lat != null && first?.lng != null) {
        lat = Number(first.lat);
        lng = Number(first.lng);
      }
    } catch {
      /* optionnel */
    }
  }

  if (!Number.isFinite(lat)) lat = 0;
  if (!Number.isFinite(lng)) lng = 0;

  const complement = parsed.complement?.trim() ? parsed.complement.trim() : undefined;
  return { label, lat, lng, ...(complement ? { complement } : {}) };
}
