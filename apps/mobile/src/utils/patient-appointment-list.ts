import type { Appointment } from '@oneandlab/shared-types';
import { appointmentVisitDayKeys } from '@oneandlab/shared-utils';

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

/** Passé / terminé : statut terminal, ou chaque jour de visite déjà avant aujourd'hui (Paris). */
export function isAppointmentPastForList(apt: Appointment): boolean {
  const st = normalizeAppointmentStatus(apt.status);
  if (TERMINAL_STATUSES.has(st)) return true;
  const days = appointmentVisitDayKeys(apt);
  if (days.length === 0) return false;
  const today = parisYmd(new Date());
  return days.every((day) => day < today);
}

/** À venir : complément de {@link isAppointmentPastForList} (sans date = encore à planifier). */
export function isPatientUpcomingAppointment(apt: Appointment): boolean {
  return !isAppointmentPastForList(apt);
}

export function isAppointmentForRelative(apt: Appointment): boolean {
  const ext = apt as Appointment & { relative_id?: string | null; relative?: unknown };
  return Boolean(ext.relative_id || ext.relative);
}
