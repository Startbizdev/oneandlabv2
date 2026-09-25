import type { Appointment } from '@oneandlab/shared-types';
import { appointmentDayFrance } from '@oneandlab/shared-utils';

/** Jour d’affichage sur le calendrier (YYYY-MM-DD, jour civil France). */
export function appointmentCalendarDayKey(apt: Appointment): string | null {
  const raw = apt.scheduled_at || apt.created_at;
  if (!raw) return null;
  const key = appointmentDayFrance(raw);
  return key || null;
}

export function appointmentInCalendarMonth(
  apt: Appointment,
  rangeFrom: string,
  rangeTo: string,
): boolean {
  const key = appointmentCalendarDayKey(apt);
  if (!key) return false;
  return key >= rangeFrom && key <= rangeTo;
}
