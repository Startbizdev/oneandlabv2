import type { SelectedServiceInput } from '@oneandlab/shared-utils';
import { parseAvailabilityField } from './availability';
import { formatBookingHour } from './booking-availability-utils';
import { formatBookingSelectedDay, parseIsoDay } from './booking-date-utils';
import {
  bookingWizardLotKind,
  bookingWizardLotTitle,
  servicesInActiveLot,
} from './booking-wizard-lot';

export type BookingReviewSlot = {
  serviceId: string;
  title: string;
  dateLabel: string;
  timeLabel: string;
};

type FormDataByService = Record<string, Record<string, unknown>>;

function capitalizeFirst(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

/** Créneau tel que saisi par l'utilisateur (aucun calcul de disponibilité côté mobile). */
export function bookingAvailabilityLabel(slice: Record<string, unknown>): string {
  const availability = parseAvailabilityField(slice.availability, {
    availability_type: slice.availability_type,
    availabilityRange: slice.availabilityRange,
    urgentHour: slice.urgentHour,
    urgentMinute: slice.urgentMinute,
    urgentTimingMode: slice.urgentTimingMode,
  });
  if (availability.type === 'urgent') {
    if (availability.urgentTimingMode === 'asap') return 'Prioritaire · le plus vite possible';
    return `Prioritaire · ${availability.urgentHour}h${String(availability.urgentMinute).padStart(2, '0')}`;
  }
  if (availability.type === 'custom') {
    return `Entre ${formatBookingHour(availability.range[0])} et ${formatBookingHour(availability.range[1])}`;
  }
  return 'Toute la journée';
}

export function bookingDayLabel(scheduledAt: unknown): string {
  const day = parseIsoDay(typeof scheduledAt === 'string' ? scheduledAt : '');
  return day ? capitalizeFirst(formatBookingSelectedDay(day)) : 'Date à choisir';
}

/** Une ligne par créneau saisi (un lot de soins partage le même créneau). */
export function bookingReviewSlots(
  slotRows: SelectedServiceInput[],
  selectedServices: SelectedServiceInput[],
  formDataByService: FormDataByService,
): BookingReviewSlot[] {
  return slotRows.map((row) => {
    const slice = formDataByService[row.id] ?? {};
    const lot = servicesInActiveLot(selectedServices, row.id);
    return {
      serviceId: row.id,
      title: bookingWizardLotTitle(lot.length > 0 ? lot : [row], bookingWizardLotKind(row)),
      dateLabel: bookingDayLabel(slice.scheduled_at),
      timeLabel: bookingAvailabilityLabel(slice),
    };
  });
}

/** Option catalogue « À jeun » (`a_jeun`) renseignée à « oui » sur au moins un soin. */
export function selectionRequiresFasting(
  selectedServices: SelectedServiceInput[],
  formDataByService: FormDataByService,
): boolean {
  return selectedServices.some((svc) => {
    const options = formDataByService[svc.id]?.care_options;
    return typeof options === 'object' && options !== null && 'a_jeun' in options && options.a_jeun === 'oui';
  });
}
