import dayjs from 'dayjs';
import type { Appointment } from '@oneandlab/shared-types';

/** Jour d’affichage sur le calendrier (YYYY-MM-DD). */
export function appointmentCalendarDayKey(apt: Appointment): string | null {
  const raw = apt.scheduled_at || apt.created_at;
  if (!raw) return null;
  const d = dayjs(raw);
  if (!d.isValid()) return null;
  return d.format('YYYY-MM-DD');
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
