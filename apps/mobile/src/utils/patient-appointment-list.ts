import type { Appointment } from '@oneandlab/shared-types';

/** Statuts terminaux — aligné web `frontend/pages/patient/index.vue`. */
const TERMINAL_STATUSES = new Set([
  'completed',
  'canceled',
  'cancelled',
  'refused',
  'expired',
]);

function normalizeAppointmentStatus(status: unknown): string {
  return String(status ?? '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_');
}

function parisYmd(d: Date): string {
  return d.toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' });
}

function appointmentParisYmd(iso: string | undefined | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' });
}

/** À venir : date (Paris) ≥ aujourd'hui et statut non terminal. */
export function isPatientUpcomingAppointment(apt: Appointment): boolean {
  const st = normalizeAppointmentStatus(apt.status);
  if (TERMINAL_STATUSES.has(st)) return false;
  const day = appointmentParisYmd(apt.scheduled_at);
  if (!day) return true;
  return day >= parisYmd(new Date());
}

export function isAppointmentForRelative(apt: Appointment): boolean {
  const ext = apt as Appointment & { relative_id?: string | null; relative?: unknown };
  return Boolean(ext.relative_id || ext.relative);
}
