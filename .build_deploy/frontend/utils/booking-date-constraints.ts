import { CalendarDate, now, today, toCalendarDate } from '@internationalized/date';

export const PARIS_TZ = 'Europe/Paris';

/** Première date sélectionnable (Paris) avec prise en compte du délai métier minimal. */
export function bookingMinCalendarDate(minLeadTimeHours?: number | null): CalendarDate {
  const hours = minLeadTimeHours;
  if (hours != null && hours !== undefined) {
    const h = Number(hours);
    if (Number.isFinite(h) && h >= 0) {
      return toCalendarDate(now(PARIS_TZ).add({ hours: Math.floor(h) }));
    }
  }
  return today(PARIS_TZ);
}

/** Même règles que le calendrier de réservation / `DatePicker` (sam. / dim.). */
export function isBookingDateUnavailable(
  date: CalendarDate,
  opts: { acceptSaturday?: boolean; acceptSunday?: boolean },
): boolean {
  const day = date.toDate(PARIS_TZ).getDay();
  if (day === 0 && opts.acceptSunday === false) return true;
  if (day === 6 && opts.acceptSaturday === false) return true;
  return false;
}
