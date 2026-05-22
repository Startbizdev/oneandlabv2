import type { AddressPayload } from '@/features/appointments/form/types';

/** Normalise l’adresse profil API (objet ou JSON string). */
export function parseProfileAddress(raw: unknown): AddressPayload | null {
  if (!raw) return null;
  let obj: Record<string, unknown>;
  if (typeof raw === 'string') {
    try {
      obj = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return { label: raw, lat: 0, lng: 0 };
    }
  } else if (typeof raw === 'object') {
    obj = raw as Record<string, unknown>;
  } else {
    return null;
  }
  const label = String(obj.label ?? '').trim();
  const lat = Number(obj.lat);
  const lng = Number(obj.lng);
  if (!label) return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { label, lat: 0, lng: 0 };
  }
  return {
    label,
    lat,
    lng,
    complement: obj.complement != null ? String(obj.complement) : undefined,
  };
}

export function hasValidGeoAddress(addr: AddressPayload | null): boolean {
  return (
    !!addr?.label?.trim() &&
    Number.isFinite(addr.lat) &&
    Number.isFinite(addr.lng) &&
    addr.lat !== 0 &&
    addr.lng !== 0
  );
}
