import type { Appointment, NursePassageNursingItem, NursePassageSeriesInput, PassageTimeSlot } from '@oneandlab/shared-types';
import {
  resolvePassageTimeSlotForAppointment,
  passageAvailabilityJson,
  passageScheduledAtParis,
  resolvePassageTimeRange,
} from '@oneandlab/shared-utils';

export type PassageFormSnapshot = {
  time_slot: PassageTimeSlot;
  custom_time: string | null;
  time_range?: [number, number] | null;
  duration_minutes: number;
  at_home: boolean;
  nursing_items: NursePassageNursingItem[];
  notes: string | null;
};

export function initPassageFormFromAppointment(apt: Appointment): PassageFormSnapshot {
  const fd = (apt.form_data ?? {}) as Record<string, unknown>;
  const availability = fd.availability ?? null;
  const timeSlot = resolvePassageTimeSlotForAppointment(availability, fd.passage_time_slot);
  const rawDuration = Number(fd.passage_duration_minutes);
  const durationMinutes = Number.isFinite(rawDuration) && rawDuration > 0 ? rawDuration : 30;

  const rawItems =
    (Array.isArray(apt.nursing_items_display) && apt.nursing_items_display.length > 0
      ? apt.nursing_items_display
      : null) ??
    apt.nursing_items ??
    fd.nursing_items;
  const nursingItems = Array.isArray(rawItems)
    ? (rawItems as Record<string, unknown>[]).map((row) => {
        const label = String(row.label ?? row.category_name ?? '').trim();
        const categoryName = String(row.category_name ?? apt.category_name ?? '').trim();
        return {
          category_id: String(row.category_id ?? apt.category_id ?? ''),
          label: label || categoryName || null,
          care_options: row.care_options as NursePassageNursingItem['care_options'],
          duration_days:
            row.duration_days != null ? String(row.duration_days) : undefined,
          custom_days:
            row.custom_days != null ? Number(row.custom_days) : undefined,
          frequency: row.frequency != null ? String(row.frequency) : undefined,
        } satisfies NursePassageNursingItem;
      }).filter((item) => item.category_id)
    : [];

  return {
    time_slot: timeSlot,
    custom_time: fd.custom_time != null ? String(fd.custom_time) : null,
    time_range: resolvePassageTimeRange({
      time_slot: timeSlot,
      custom_time: fd.custom_time != null ? String(fd.custom_time) : null,
      availability,
    }),
    duration_minutes: durationMinutes,
    at_home: fd.at_home !== false,
    nursing_items: nursingItems,
    notes: fd.notes != null ? String(fd.notes) : null,
  };
}

export function buildAppointmentPassageUpdateBody(
  apt: Appointment,
  partial: Partial<NursePassageSeriesInput>,
  snapshot: PassageFormSnapshot,
): Record<string, unknown> {
  const fd = { ...(apt.form_data ?? {}) } as Record<string, unknown>;
  const timeSlot = (partial.time_slot ?? snapshot.time_slot) as PassageTimeSlot;
  const customTime =
    partial.custom_time !== undefined
      ? partial.custom_time
      : timeSlot === 'custom'
        ? snapshot.custom_time
        : null;
  const timeRange =
    partial.time_range !== undefined
      ? partial.time_range
      : timeSlot === 'all_day'
        ? null
        : snapshot.time_range ?? null;
  const durationMinutes = partial.duration_minutes ?? snapshot.duration_minutes;
  const atHome = partial.at_home ?? snapshot.at_home;
  const nursingItems = partial.nursing_items ?? snapshot.nursing_items;
  const notes = partial.notes !== undefined ? partial.notes : snapshot.notes;

  fd.passage_time_slot = timeSlot;
  fd.passage_duration_minutes = durationMinutes;
  fd.at_home = atHome;
  fd.nursing_items = nursingItems;
  if (notes != null && notes !== '') {
    fd.notes = notes;
  } else {
    delete fd.notes;
  }
  if (timeSlot === 'custom' && customTime) {
    fd.custom_time = customTime;
  } else {
    delete fd.custom_time;
  }
  fd.availability = passageAvailabilityJson(timeSlot, customTime, timeRange);

  const dateYmd =
    apt.scheduled_at?.slice(0, 10) ?? new Date().toISOString().slice(0, 10);
  const scheduledAt =
    timeSlot === 'all_day'
      ? `${dateYmd} 08:00:00`
      : passageScheduledAtParis(dateYmd, timeSlot, customTime);

  return {
    form_data: fd,
    scheduled_at: scheduledAt,
  };
}
