import { isBloodTestAppointment } from './appointment-type-rules';

export type PatientUrgencySlice = {
  enabled?: boolean;
  paid?: boolean;
  asap?: boolean;
  hour?: number;
  minute?: number;
};

/** Parse `availability` (JSON string ou objet) → type (`urgent`, `custom`, …). */
export function parseAvailabilityType(availability: unknown): string | null {
  if (availability == null || availability === '') return null;
  if (typeof availability === 'object' && availability !== null && 'type' in availability) {
    return String((availability as { type: unknown }).type);
  }
  if (typeof availability === 'string') {
    try {
      const parsed = JSON.parse(availability) as { type?: unknown };
      if (parsed && typeof parsed === 'object' && parsed.type != null) {
        return String(parsed.type);
      }
    } catch {
      /* ignore */
    }
  }
  return null;
}

function sliceAvailabilityIsUrgent(slice: Record<string, unknown>): boolean {
  if (slice.availability_type === 'urgent') return true;
  return parseAvailabilityType(slice.availability) === 'urgent';
}

/** Le slice demande réellement l’horaire VIP (onglet ou JSON dispo, pas un reste de brouillon). */
export function formSliceRequestsPatientUrgency(slice: Record<string, unknown> | undefined | null): boolean {
  if (!slice) return false;
  return sliceAvailabilityIsUrgent(slice);
}

/** Prise de sang patient : supplément VIP requis avant création directe du RDV. */
export function formSliceNeedsVipPayment(
  serviceType: string,
  slice: Record<string, unknown> | undefined | null,
): boolean {
  if (!isBloodTestAppointment(serviceType)) return false;
  return formSliceRequestsPatientUrgency(slice);
}

/** Retire `patient_urgency` si l’onglet / la dispo n’est plus VIP (évite les restes de brouillon). */
export function stripStalePatientUrgencyFromSlice<T extends Record<string, unknown>>(slice: T): T {
  if (sliceAvailabilityIsUrgent(slice)) {
    return slice;
  }
  const { patient_urgency: _drop, ...rest } = slice;
  return rest as T;
}

/** Détection côté API : VIP demandé (y compris payload manipulé). */
export function formSliceClaimsPatientUrgency(slice: Record<string, unknown> | undefined | null): boolean {
  if (!slice) return false;
  if (sliceAvailabilityIsUrgent(slice)) return true;
  const pu = slice.patient_urgency;
  return !!(pu && typeof pu === 'object' && (pu as PatientUrgencySlice).enabled === true);
}
