import { PASSAGE_SLOT_DEFAULT_HOURS, type PassageTimeSlot } from '@oneandlab/shared-types';

export const PASSAGE_TIME_SLOT_LABELS: Record<PassageTimeSlot, string> = {
  morning: 'Matin',
  noon: 'Midi',
  afternoon: 'Après-midi',
  evening: 'Soir',
  night: 'Nuit',
  custom: 'Personnalisée',
  all_day: 'Toute la journée',
};

export type PassageFormDataLike = {
  passage_source?: unknown;
  passage_time_slot?: unknown;
  passage_duration_minutes?: unknown;
  custom_time?: unknown;
  at_home?: unknown;
  availability?: unknown;
};

/** Plages availability JSON produites par PassageSlotResolver (PHP). */
const PASSAGE_AVAILABILITY_RANGE_TO_SLOT: Record<string, PassageTimeSlot> = {
  '8-12': 'morning',
  '12-14': 'noon',
  '14-18': 'afternoon',
  '18-21': 'evening',
  '21-23': 'night',
};

/** RDV patient « toute la journée » (availability JSON ou chaîne legacy). */
export function isAllDayAvailability(availability: unknown): boolean {
  if (availability == null) return false;
  try {
    if (typeof availability === 'string') {
      const trimmed = availability.trim();
      if (!trimmed) return false;
      const low = trimmed.toLowerCase();
      if (low === 'allday' || low === 'full_day' || low === 'fullday') return true;
      if (low === 'specificslot' || low === 'specific_slot') return false;
      const avail = JSON.parse(trimmed) as Record<string, unknown>;
      const typ = String(avail.type ?? '').toLowerCase().replace(/-/g, '_');
      return typ === 'all_day' || typ === 'fullday' || typ === 'full_day';
    }
    if (typeof availability === 'object' && availability !== null && !Array.isArray(availability)) {
      const avail = availability as Record<string, unknown>;
      const typ = String(avail.type ?? '').toLowerCase().replace(/-/g, '_');
      return typ === 'all_day' || typ === 'fullday' || typ === 'full_day';
    }
  } catch {
    /* ignore */
  }
  return false;
}

function parseAvailabilityRange(availability: unknown): [number, number] | null {
  try {
    let avail: Record<string, unknown> | null = null;
    if (typeof availability === 'string') {
      const trimmed = availability.trim();
      if (!trimmed) return null;
      avail = JSON.parse(trimmed) as Record<string, unknown>;
    } else if (typeof availability === 'object' && availability !== null && !Array.isArray(availability)) {
      avail = availability as Record<string, unknown>;
    }
    if (!avail || !Array.isArray(avail.range) || avail.range.length < 2) return null;
    const start = Math.floor(Number(avail.range[0]));
    const end = Math.floor(Number(avail.range[1]));
    if (Number.isNaN(start) || Number.isNaN(end)) return null;
    return [start, end];
  } catch {
    return null;
  }
}

/** Déduit le créneau passage depuis la plage horaire enregistrée sur le RDV. */
export function inferPassageTimeSlotFromAvailability(availability: unknown): PassageTimeSlot | null {
  if (isAllDayAvailability(availability)) return 'all_day';
  const range = parseAvailabilityRange(availability);
  if (!range) return null;
  return PASSAGE_AVAILABILITY_RANGE_TO_SLOT[`${range[0]}-${range[1]}`] ?? null;
}

const PASSAGE_TIME_SLOTS = new Set<PassageTimeSlot>([
  'morning',
  'noon',
  'afternoon',
  'evening',
  'night',
  'custom',
  'all_day',
]);

/** Créneau initial depuis un RDV booking (respecte all_day sans forcer « matin »). */
export function resolvePassageTimeSlotForAppointment(
  availability: unknown,
  passageTimeSlot?: unknown,
): PassageTimeSlot {
  const explicit = String(passageTimeSlot ?? '').trim() as PassageTimeSlot;
  if (explicit && PASSAGE_TIME_SLOTS.has(explicit)) {
    return explicit;
  }
  if (isAllDayAvailability(availability)) {
    return 'all_day';
  }
  return inferPassageTimeSlotFromAvailability(availability) ?? 'morning';
}

function resolvePassageTimeSlot(
  explicitSlot: string | null | undefined,
  availability: unknown,
): string {
  const slot = String(explicitSlot ?? '').trim();
  if (slot === 'all_day') return 'all_day';
  if (slot) return slot;
  if (isAllDayAvailability(availability)) return 'all_day';
  return inferPassageTimeSlotFromAvailability(availability) ?? '';
}

export function isNursePassageFormData(
  formData: PassageFormDataLike | null | undefined,
  passageSource?: string | null,
): boolean {
  if (passageSource === 'nurse_passage') return true;
  if (!formData || typeof formData !== 'object') return false;
  if (formData.passage_source === 'nurse_passage') return true;
  const slot = String(formData.passage_time_slot ?? '').trim();
  return slot.length > 0;
}

function formatParisTimeFromScheduledAt(scheduledAt: string | null | undefined): string | null {
  if (!scheduledAt) return null;
  try {
    const d = new Date(scheduledAt);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleTimeString('fr-FR', {
      timeZone: 'Europe/Paris',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return null;
  }
}

export function formatPassageTimeSlotLabel(
  timeSlot: PassageTimeSlot | string | null | undefined,
  scheduledAt?: string | null,
  customTime?: string | null,
): string {
  const slot = String(timeSlot ?? '').trim() as PassageTimeSlot;
  if (slot && slot !== 'custom') {
    return PASSAGE_TIME_SLOT_LABELS[slot] ?? slot;
  }
  if (slot === 'custom') {
    const raw = String(customTime ?? '').trim();
    if (raw) return `Personnalisée · ${raw.slice(0, 5)}`;
    const fromSchedule = formatParisTimeFromScheduledAt(scheduledAt);
    return fromSchedule ? `Personnalisée · ${fromSchedule}` : 'Personnalisée';
  }
  return formatParisTimeFromScheduledAt(scheduledAt) ?? '—';
}

export function formatPassageTimeSlotFromFormData(
  formData: PassageFormDataLike,
  scheduledAt?: string | null,
): string {
  const slot = resolvePassageTimeSlot(formData.passage_time_slot as string | undefined, formData.availability);
  return formatPassageTimeSlotLabel(
    slot as PassageTimeSlot | undefined,
    scheduledAt,
    formData.custom_time != null ? String(formData.custom_time) : null,
  );
}

export function formatPassageDurationLabel(minutes: number | null | undefined): string | null {
  const min = Number(minutes);
  if (!Number.isFinite(min) || min <= 0) return null;
  if (min === 60) return '1 h';
  if (min % 60 === 0) return `${min / 60} h`;
  return `${min} min`;
}

export function formatPassageDurationFromFormData(formData: PassageFormDataLike): string | null {
  return formatPassageDurationLabel(Number(formData.passage_duration_minutes));
}

export function formatPassageLocationFromFormData(formData: PassageFormDataLike): string {
  return formData.at_home === false ? 'Au cabinet' : 'À domicile';
}

const PASSAGE_AVAILABILITY_RANGES: Record<
  Exclude<PassageTimeSlot, 'custom' | 'all_day'>,
  [number, number]
> = {
  morning: [8, 12],
  noon: [12, 14],
  afternoon: [14, 18],
  evening: [18, 21],
  night: [21, 23],
};

/** Plage horaire depuis availability JSON. */
export function parsePassageAvailabilityRange(availability: unknown): [number, number] | null {
  return parseAvailabilityRange(availability);
}

export function passagePresetRangeForSlot(
  timeSlot: PassageTimeSlot,
): [number, number] | null {
  if (timeSlot === 'all_day' || timeSlot === 'custom') return null;
  return PASSAGE_AVAILABILITY_RANGES[timeSlot] ?? null;
}

export function passageSlotFromRange(range: [number, number]): PassageTimeSlot {
  return inferPassageTimeSlotFromAvailability({ type: 'custom', range }) ?? 'custom';
}

export function resolvePassageTimeRange(input: {
  time_slot: PassageTimeSlot;
  availability?: unknown;
  planning_config?: unknown;
  custom_time?: string | null;
}): [number, number] {
  const cfg = input.planning_config as { time_range?: unknown } | null | undefined;
  if (Array.isArray(cfg?.time_range) && cfg.time_range.length >= 2) {
    const lo = Math.floor(Number(cfg.time_range[0]));
    const hi = Math.floor(Number(cfg.time_range[1]));
    if (!Number.isNaN(lo) && !Number.isNaN(hi) && hi > lo) return [lo, hi];
  }
  const fromAvail = parseAvailabilityRange(input.availability);
  if (fromAvail) return fromAvail;
  const preset = passagePresetRangeForSlot(input.time_slot);
  if (preset) return preset;
  if (input.time_slot === 'custom' && input.custom_time) {
    const parts = input.custom_time.trim().split(':');
    const h = Math.min(23, Math.max(0, parseInt(parts[0] ?? '9', 10) || 9));
    return [h, Math.min(23, h + 2)];
  }
  return [8, 12];
}

function formatPassageHourLabel(h: number): string {
  const n = Math.floor(h);
  const mins = Math.round((h - n) * 60);
  return `${n}h${mins.toString().padStart(2, '0')}`;
}

export function formatPassageTimeSelectionSummary(
  timeSlot: PassageTimeSlot,
  customTime?: string | null,
  range?: [number, number] | null,
): string {
  if (timeSlot === 'all_day') return 'Toute la journée';
  const effectiveRange = range ?? passagePresetRangeForSlot(timeSlot);
  if (effectiveRange) {
    const preset = passageSlotFromRange(effectiveRange);
    if (preset !== 'custom' && PASSAGE_TIME_SLOT_LABELS[preset]) {
      return `${PASSAGE_TIME_SLOT_LABELS[preset]} · ${formatPassageHourLabel(effectiveRange[0])} — ${formatPassageHourLabel(effectiveRange[1])}`;
    }
    return `${formatPassageHourLabel(effectiveRange[0])} — ${formatPassageHourLabel(effectiveRange[1])}`;
  }
  if (timeSlot === 'custom' && customTime?.trim()) {
    return `Personnalisée · ${customTime.trim().slice(0, 5)}`;
  }
  return PASSAGE_TIME_SLOT_LABELS[timeSlot] ?? timeSlot;
}

/** JSON availability aligné sur PassageSlotResolver (PHP). */
export function passageAvailabilityJson(
  timeSlot: PassageTimeSlot | string,
  customTime?: string | null,
  rangeOverride?: [number, number] | null,
): string {
  if (timeSlot === 'all_day') {
    return JSON.stringify({ type: 'all_day' });
  }
  if (rangeOverride && rangeOverride.length >= 2) {
    return JSON.stringify({ type: 'custom', range: rangeOverride });
  }
  if (timeSlot === 'custom' && customTime) {
    const parts = customTime.trim().split(':');
    const h = Math.min(23, Math.max(0, parseInt(parts[0] ?? '9', 10) || 9));
    return JSON.stringify({ type: 'custom', range: [h, Math.min(23, h + 1)] });
  }
  const range = PASSAGE_AVAILABILITY_RANGES[timeSlot as Exclude<PassageTimeSlot, 'custom' | 'all_day'>] ?? [8, 12];
  return JSON.stringify({ type: 'custom', range });
}

/** scheduled_at MySQL (Europe/Paris) pour un créneau passage. */
export function passageScheduledAtParis(
  dateYmd: string,
  timeSlot: PassageTimeSlot | string,
  customTime?: string | null,
): string {
  let h = 8;
  let m = 0;
  if (timeSlot === 'all_day') {
    h = 8;
    m = 0;
  } else if (timeSlot === 'custom' && customTime) {
    const parts = customTime.trim().split(':');
    h = Math.min(23, Math.max(0, parseInt(parts[0] ?? '9', 10) || 9));
    m = Math.min(59, Math.max(0, parseInt(parts[1] ?? '0', 10) || 0));
  } else {
    const slot = PASSAGE_SLOT_DEFAULT_HOURS[timeSlot as Exclude<PassageTimeSlot, 'custom'>];
    if (slot) {
      h = slot.hour;
      m = slot.minute;
    }
  }
  return `${dateYmd} ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
}

/** Créneau pour stop tournée (priorité passage_time_slot, puis plage availability). */
export function formatPassageStopTimeLabel(input: {
  passage_time_slot?: string | null;
  scheduled_at?: string | null;
  availability?: unknown;
  custom_time?: string | null;
  passage_custom_time?: string | null;
}): string | null {
  const explicitSlot = String(input.passage_time_slot ?? '').trim();
  if (!explicitSlot && isAllDayAvailability(input.availability)) {
    return 'Toute la journée';
  }

  const slot = resolvePassageTimeSlot(input.passage_time_slot, input.availability);
  if (!slot) {
    const fromSchedule = formatParisTimeFromScheduledAt(input.scheduled_at ?? null);
    return fromSchedule ?? null;
  }

  const custom =
    input.custom_time != null
      ? String(input.custom_time)
      : input.passage_custom_time != null
        ? String(input.passage_custom_time)
        : null;
  return formatPassageTimeSlotLabel(slot, input.scheduled_at ?? null, custom);
}

export type TourStopRouteLike = {
  distance_km_from_prev?: number | null;
  drive_min_from_prev?: number | null;
};

/** Distance / durée de trajet depuis le passage précédent (tournée optimisée). */
export function resolveTourStopRouteMetrics(stop: TourStopRouteLike): { km: number; min: number } | null {
  const km = Number(stop.distance_km_from_prev ?? 0);
  if (!Number.isFinite(km) || km <= 0) return null;
  const min = Math.max(0, Math.round(Number(stop.drive_min_from_prev ?? 0)));
  return { km, min };
}

/** Ligne compacte « X km · ~Y min » sous l'horaire (liste tournée). */
export function formatTourStopRouteLineText(
  stop: TourStopRouteLike,
  stopIndex = 0,
): string | null {
  if (stopIndex <= 0) return null;

  const km = Number(stop.distance_km_from_prev ?? 0);
  if (!Number.isFinite(km) || km < 0) return null;

  const min =
    km <= 0 ? 1 : Math.max(1, Math.round(Number(stop.drive_min_from_prev ?? 0)));
  return `${km.toFixed(1)} km · ~${min} min`;
}
