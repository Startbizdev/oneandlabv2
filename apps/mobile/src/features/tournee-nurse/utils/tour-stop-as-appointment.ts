import type { Appointment } from '@oneandlab/shared-types';
import type { NurseTourStop } from '../api/nurse-tour.service';

/** Adapte un passage tournée au shape `Appointment` pour réutiliser les composants RDV. */
export function tourStopAsAppointment(stop: NurseTourStop): Appointment {
  const fd: Record<string, unknown> = {};
  if (stop.availability != null) fd.availability = stop.availability;
  if (stop.care_options && Object.keys(stop.care_options).length > 0) {
    fd.care_options = stop.care_options;
  } else {
    const firstItem = stop.nursing_items?.[0] as Record<string, unknown> | undefined;
    const itemOptions = firstItem?.care_options;
    if (itemOptions && typeof itemOptions === 'object' && Object.keys(itemOptions as object).length > 0) {
      fd.care_options = itemOptions;
    }
  }

  const nursingDisplay =
    stop.nursing_items_display?.length
      ? stop.nursing_items_display
      : stop.nursing_items?.length
        ? stop.nursing_items
        : undefined;

  return {
    id: stop.appointment_id,
    type: stop.type ?? 'nursing',
    status: stop.status,
    scheduled_at: stop.scheduled_at ?? undefined,
    category_id: stop.category_id ?? undefined,
    category_name: stop.category_name,
    category_icon: stop.category_icon,
    category_image_url: stop.category_image_url,
    creation_batch_id: stop.creation_batch_id ?? undefined,
    form_data: fd,
    nursing_items: stop.nursing_items,
    nursing_items_display: nursingDisplay,
  } as Appointment;
}
