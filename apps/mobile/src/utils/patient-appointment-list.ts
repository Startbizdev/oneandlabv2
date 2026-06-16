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

/** Passé / terminé : statut terminal ou date (Paris) strictement avant aujourd'hui. */
export function isAppointmentPastForList(apt: Appointment): boolean {
  const st = normalizeAppointmentStatus(apt.status);
  if (TERMINAL_STATUSES.has(st)) return true;
  const day = appointmentParisYmd(apt.scheduled_at);
  if (!day) return false;
  return day < parisYmd(new Date());
}

/** À venir : complément de {@link isAppointmentPastForList} (sans date = encore à planifier). */
export function isPatientUpcomingAppointment(apt: Appointment): boolean {
  return !isAppointmentPastForList(apt);
}

export function isAppointmentForRelative(apt: Appointment): boolean {
  const ext = apt as Appointment & { relative_id?: string | null; relative?: unknown };
  return Boolean(ext.relative_id || ext.relative);
}
