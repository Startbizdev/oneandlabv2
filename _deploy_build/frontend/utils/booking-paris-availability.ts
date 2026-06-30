import { CalendarDate, now, parseDate, today } from '@internationalized/date';
import { PARIS_TZ } from '~/utils/booking-date-constraints';
import { AVAILABILITY_MIN_SPAN_HOURS } from '~/constants/availability-slot';

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
  const t = today(PARIS_TZ);
  return date.compare(t) === 0;
}

/** Heure entière minimale pour un créneau « le jour même » à Paris (strictement après l’instant présent). */
export function parisNextWholeHourFromNow(): number {
  const n = now(PARIS_TZ);
  let h = n.hour;
  if (n.minute > 0 || n.second > 0 || n.millisecond > 0) {
    h += 1;
  }
  return h;
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
  const cd = extractBookingCalendarDateYmd(scheduledRaw ?? '');
  if (!cd || !isParisCalendarToday(cd)) {
    return availabilityMin;
  }
  const ceil = parisNextWholeHourFromNow();
  let lo = Math.max(availabilityMin, ceil);
  const upper = slotMaxHour - AVAILABILITY_MIN_SPAN_HOURS;
  if (upper < availabilityMin) {
    return availabilityMin;
  }
  lo = Math.min(lo, upper);
  return Math.max(availabilityMin, lo);
}
