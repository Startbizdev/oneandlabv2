import {
  PASSAGE_SLOT_DEFAULT_HOURS,
  type PassageDailyTimeSlot,
  type PassageTimeSlot,
} from '@oneandlab/shared-types';
import { PASSAGE_TIME_SLOT_LABELS } from '@oneandlab/shared-utils';

export const PRESET_DAILY_SLOTS: PassageTimeSlot[] = ['morning', 'noon', 'afternoon', 'evening', 'night'];
const FALLBACK_TIME = '09:00';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function defaultSlotTime(slot: PassageTimeSlot): string {
  if (slot === 'custom') return FALLBACK_TIME;
  const { hour, minute } = PASSAGE_SLOT_DEFAULT_HOURS[slot];
  return `${pad(hour)}:${pad(minute)}`;
}

/** Heure réellement planifiée (HH:MM) ; null pour « toute la journée ». */
export function dailySlotTime(slot: PassageDailyTimeSlot): string | null {
  if (slot.time_slot === 'all_day') return null;
  return slot.custom_time?.slice(0, 5) || defaultSlotTime(slot.time_slot);
}

/** Une heure égale à l'heure par défaut du créneau n'est pas stockée comme heure précise. */
export function withDailySlotTime(slot: PassageDailyTimeSlot, hhmm: string): PassageDailyTimeSlot {
  if (slot.time_slot === 'all_day') return slot;
  if (slot.time_slot !== 'custom' && hhmm === defaultSlotTime(slot.time_slot)) {
    return { time_slot: slot.time_slot, custom_time: null };
  }
  return { time_slot: slot.time_slot, custom_time: hhmm };
}

/** Un passage par heure et par jour, triés chronologiquement ; « toute la journée » reste seul. */
export function normalizeDailySlots(slots: PassageDailyTimeSlot[]): PassageDailyTimeSlot[] {
  const allDay = slots.find((s) => s.time_slot === 'all_day');
  if (allDay) return [{ time_slot: 'all_day', custom_time: null }];
  const seen = new Set<string>();
  const unique: PassageDailyTimeSlot[] = [];
  for (const slot of slots) {
    const time = dailySlotTime(slot) ?? '';
    if (seen.has(time)) continue;
    seen.add(time);
    unique.push(slot);
  }
  return unique.sort((a, b) => (dailySlotTime(a) ?? '').localeCompare(dailySlotTime(b) ?? ''));
}

export function formatDailySlotLabel(slot: PassageDailyTimeSlot): string {
  if (slot.custom_time && slot.time_slot !== 'all_day') {
    return slot.custom_time.slice(0, 5).replace(':', 'h');
  }
  return PASSAGE_TIME_SLOT_LABELS[slot.time_slot];
}

/** Créneaux de la série : planning_config.daily_time_slots, sinon le créneau principal. */
export function seriesDailySlots(series: {
  time_slot: PassageTimeSlot;
  custom_time?: string | null;
  planning_config?: { daily_time_slots?: PassageDailyTimeSlot[] } | null;
}): PassageDailyTimeSlot[] {
  const configured = series.planning_config?.daily_time_slots;
  if (configured && configured.length > 0) return configured;
  return [
    {
      time_slot: series.time_slot,
      custom_time: series.time_slot === 'all_day' ? null : series.custom_time?.slice(0, 5) ?? null,
    },
  ];
}
