import {
  buildAvailabilityPayload,
  isAvailabilityValid,
  type AvailabilityType,
} from '@/features/appointments/form/utils/availability';
import { normalizeRescheduleDate } from '@/features/appointments/reschedule/utils/normalize-reschedule-date';

export type TourReschedulePayload = {
  scheduled_at: string;
  availability: string;
};

export function buildTourReschedulePayload(input: {
  dateYmd: string;
  availabilityType: AvailabilityType;
  range: [number, number];
}): TourReschedulePayload | null {
  if (!isAvailabilityValid(input.availabilityType, input.range)) return null;
  const date = normalizeRescheduleDate(input.dateYmd);
  const hour = input.availabilityType === 'custom' ? Math.floor(input.range[0]) : 9;
  const scheduledAt = `${date} ${String(hour).padStart(2, '0')}:00:00`;

  return {
    scheduled_at: scheduledAt,
    availability: buildAvailabilityPayload(input.availabilityType, input.range),
  };
}
