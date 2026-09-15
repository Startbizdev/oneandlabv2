import {
  AVAILABILITY_MAX_HOUR_BLOOD_TEST,
  AVAILABILITY_MAX_HOUR_NURSING,
  AVAILABILITY_MIN_SPAN_HOURS,
} from '@oneandlab/shared-constants';
import { bookingSlotMinHourParis, isBloodTestAppointment } from '@oneandlab/shared-utils';

export const AVAILABILITY_MIN_HOUR = 6;

export function formatBookingHour(h: number): string {
  const n = Math.floor(h);
  const mins = Math.round((h - n) * 60);
  return `${n}h${mins.toString().padStart(2, '0')}`;
}

export function availabilityMaxHour(serviceType?: string): number {
  return isBloodTestAppointment(serviceType ?? '')
    ? AVAILABILITY_MAX_HOUR_BLOOD_TEST
    : AVAILABILITY_MAX_HOUR_NURSING;
}

/** Borne basse du slider si la date choisie est aujourd'hui. */
export function availabilitySliderMinHour(
  scheduledAt: string | undefined,
  maxHour: number,
  minHour = AVAILABILITY_MIN_HOUR,
): number {
  return bookingSlotMinHourParis(scheduledAt, maxHour, minHour);
}

export function clampAvailabilityRange(
  lo: number,
  hi: number,
  maxHour: number,
  minHour = AVAILABILITY_MIN_HOUR,
): [number, number] {
  const floor = minHour;
  const max = maxHour;
  let l = Math.max(floor, Math.min(max, Math.round(lo)));
  let h = Math.max(floor, Math.min(max, Math.round(hi)));
  if (h < l) [l, h] = [h, l];
  if (h - l < AVAILABILITY_MIN_SPAN_HOURS) {
    h = Math.min(max, l + AVAILABILITY_MIN_SPAN_HOURS);
  }
  return [l, h];
}

export function isAvailabilityRangeValid(range: [number, number]): boolean {
  return range[1] - range[0] >= AVAILABILITY_MIN_SPAN_HOURS;
}
