import type { Appointment } from '@oneandlab/shared-types';
import {
  appointmentDetailAddressLine,
  parseRawPatientAddress,
} from '@oneandlab/shared-utils';

/** Ligne d’adresse détail RDV — aligné web `appointmentDetailAddressLine`. */
export function resolveAppointmentDetailAddressLine(
  apt: Appointment | null | undefined,
  batch?: Appointment[],
): string {
  const direct = appointmentDetailAddressLine(apt);
  if (direct) return direct;
  for (const sibling of batch ?? []) {
    if (String(sibling.id) === String(apt?.id)) continue;
    const line = appointmentDetailAddressLine(sibling);
    if (line) return line;
  }
  return '';
}

export function resolveAppointmentAddressComplement(apt: Appointment | null | undefined): string {
  if (!apt) return '';
  const fd = apt.form_data as { address_complement?: unknown; address?: unknown } | undefined;
  const fromForm = fd?.address_complement;
  if (typeof fromForm === 'string' && fromForm.trim()) return fromForm.trim();

  const fromTop = parseRawPatientAddress(apt.address)?.complement;
  if (fromTop?.trim()) return fromTop.trim();

  const fromFdAddr = parseRawPatientAddress(fd?.address)?.complement;
  return fromFdAddr?.trim() ?? '';
}

export function resolveAppointmentMapCoords(
  apt: Appointment | null | undefined,
): { lat: number; lng: number } | null {
  if (!apt) return null;

  const candidates: unknown[] = [apt.address, apt.form_data?.address];
  for (const raw of candidates) {
    const parsed = parseRawPatientAddress(raw);
    if (parsed?.lat != null && parsed?.lng != null) {
      return { lat: parsed.lat, lng: parsed.lng };
    }
  }

  const latRaw = (apt as Appointment & { location_lat?: unknown }).location_lat;
  const lngRaw = (apt as Appointment & { location_lng?: unknown }).location_lng;
  const lat = latRaw != null ? Number(latRaw) : NaN;
  const lng = lngRaw != null ? Number(lngRaw) : NaN;
  if (Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0)) {
    return { lat, lng };
  }
  return null;
}
