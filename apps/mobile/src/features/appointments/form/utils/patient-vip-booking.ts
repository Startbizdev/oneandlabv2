import {
  PATIENT_VIP_MAX_HOUR,
  PATIENT_VIP_MIN_HOUR,
  PATIENT_VIP_MINUTE_STEPS,
} from '@oneandlab/shared-constants';
import { isBloodTestAppointment, type SelectedServiceInput } from '@oneandlab/shared-utils';

export type UrgentTimingMode = 'asap' | 'scheduled';

export type PatientUrgencyMeta = {
  enabled: boolean;
  asap?: boolean;
  hour?: number;
  minute?: number;
};

export function clampUrgentMinute(raw: unknown): number {
  const m = Number(raw) || 0;
  const steps = PATIENT_VIP_MINUTE_STEPS as readonly number[];
  if (steps.includes(m)) return m;
  return steps.reduce((a, b) => (Math.abs(b - m) < Math.abs(a - m) ? b : a), 0);
}

export function clampUrgentHour(raw: unknown): number {
  const h = Math.floor(Number(raw) || PATIENT_VIP_MIN_HOUR);
  return Math.min(PATIENT_VIP_MAX_HOUR, Math.max(PATIENT_VIP_MIN_HOUR, h));
}

export function buildPatientUrgencyMeta(slice: Record<string, unknown>): PatientUrgencyMeta {
  const mode = (slice.urgentTimingMode as UrgentTimingMode | undefined) ?? 'scheduled';
  if (mode === 'asap') {
    return { enabled: true, asap: true };
  }
  return {
    enabled: true,
    asap: false,
    hour: clampUrgentHour(slice.urgentHour),
    minute: clampUrgentMinute(slice.urgentMinute),
  };
}

export function buildUrgentAvailabilityJson(slice: Record<string, unknown>): string {
  const mode = (slice.urgentTimingMode as UrgentTimingMode | undefined) ?? 'scheduled';
  if (mode === 'asap') {
    return JSON.stringify({ type: 'urgent', asap: true });
  }
  return JSON.stringify({
    type: 'urgent',
    asap: false,
    hour: clampUrgentHour(slice.urgentHour),
    minute: clampUrgentMinute(slice.urgentMinute),
  });
}

/** Enrichit formDataByService avant buildDashboardAppointmentPayloads (Horaire VIP). */
export function enrichFormDataByServiceForVip(
  formDataByService: Record<string, Record<string, unknown>>,
  selectedServices: SelectedServiceInput[],
): Record<string, Record<string, unknown>> {
  const next = { ...formDataByService };
  for (const svc of selectedServices) {
    if (!isBloodTestAppointment(svc.type)) continue;
    const slice = { ...(next[svc.id] ?? {}) };
    if (slice.availability_type !== 'urgent') continue;
    slice.patient_urgency = buildPatientUrgencyMeta(slice);
    slice.availability = buildUrgentAvailabilityJson(slice);
    next[svc.id] = slice;
  }
  return next;
}

export function patientBookingNeedsVipPayment(
  formDataByService: Record<string, Record<string, unknown>>,
  selectedServices: SelectedServiceInput[],
): boolean {
  for (const svc of selectedServices) {
    if (!isBloodTestAppointment(svc.type)) continue;
    const slice = formDataByService[svc.id];
    if (slice?.availability_type === 'urgent') return true;
  }
  return false;
}
