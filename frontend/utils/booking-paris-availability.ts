import { CalendarDate, parseDate } from '@internationalized/date';
import { bookingSlotMinHourParis, parisBookingClock } from '@oneandlab/shared-utils';

/** Extrait la partie date `YYYY-MM-DD` du champ « date du RDV » (formulaire). */
export function extractBookingCalendarDateYmd(raw: string | undefined | null): CalendarDate | null {
  const s = String(raw ?? '').trim();
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (!m) return null;
  try {
    return parseDate(m[1]);
  } catch {
    return null;
  }
}

export function isParisCalendarToday(date: CalendarDate): boolean {
  return date.toString() === parisBookingClock().date;
}

/** Heure entière minimale pour un créneau « le jour même » à Paris (strictement après l’instant présent). */
export function parisNextWholeHourFromNow(): number {
  return parisBookingClock().nextHour;
}

/**
 * Borne basse du double-slider « créneau horaire » lorsque la date choisie est le jour même à Paris.
 * Sinon → `availabilityMin` (souvent 6h).
 */
export function availabilitySliderMinHourParis(
  scheduledRaw: string | undefined | null,
  slotMaxHour: number,
  availabilityMin = 6,
): number {
  return bookingSlotMinHourParis(scheduledRaw, slotMaxHour, availabilityMin);
}
