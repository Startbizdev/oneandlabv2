import type {
  NursePassageNursingItem,
  PassageDailyTimeSlot,
  PassagePlanningConfig,
  PassagePlanningType,
} from '@oneandlab/shared-types';
import {
  PASSAGE_INTERVAL_DEFAULT_DAYS,
  PASSAGE_MAX_DAYS_WITHOUT_END,
  PASSAGE_OPEN_ENDED_HORIZON_DAYS,
} from '@oneandlab/shared-types';
import dayjs from 'dayjs';

export type PlanningMode = 'single_day' | 'interval' | 'weekdays' | 'custom_dates' | 'manual';

export type PassagePlanningFormState = {
  planningMode: PlanningMode;
  startDate: string;
  everyDays: string;
  endDate: string;
  /** Passage chronique : pas de date de fin (horizon 1 an). */
  openEnded: boolean;
  /** ISO weekdays 1 (lun) … 7 (dim) */
  weekdays: number[];
  customDates: string[];
};

export function defaultPlanningFormState(
  startDate: string,
  opts?: { recurring?: boolean },
): PassagePlanningFormState {
  return {
    planningMode: 'single_day',
    startDate,
    everyDays: String(PASSAGE_INTERVAL_DEFAULT_DAYS),
    endDate: '',
    openEnded: Boolean(opts?.recurring),
    weekdays: [],
    customDates: [],
  };
}

/** Nombre de jours calendaires d'un soin (1 = une seule fois). */
export function careItemDurationDays(item: NursePassageNursingItem): number | null {
  const raw = item.duration_days?.trim();
  if (!raw || raw === '1' || raw === 'to_define') return raw === '1' ? 1 : null;
  if (raw === 'custom') {
    const n = item.custom_days ?? 0;
    return n > 0 ? n : null;
  }
  if (raw === '60+') return 60;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function maxCareDurationDays(items: NursePassageNursingItem[]): number | null {
  let max: number | null = null;
  for (const item of items) {
    const d = careItemDurationDays(item);
    if (d == null) continue;
    max = max == null ? d : Math.max(max, d);
  }
  return max;
}

export function endDateFromStartAndDays(startDate: string, days: number): string {
  return dayjs(startDate).add(Math.max(0, days - 1), 'day').format('YYYY-MM-DD');
}

/** Fréquence soin → intervalle en jours (null = laisser l'utilisateur choisir). */
export function frequencyToEveryDays(frequency: string | null | undefined): number | null {
  switch (frequency) {
    case 'once_daily':
      return 1;
    case 'twice_daily':
      return 1;
    default:
      return null;
  }
}

/**
 * Suggestion planification depuis les soins (durée + fréquence).
 * Ne modifie pas si l'utilisateur a déjà une date de fin.
 */
export function suggestPlanningFromCare(
  state: PassagePlanningFormState,
  items: NursePassageNursingItem[],
): Partial<PassagePlanningFormState> | null {
  if (items.length === 0) return null;
  const duration = maxCareDurationDays(items);
  if (duration == null || duration <= 1) return null;

  const patch: Partial<PassagePlanningFormState> = {};
  if (!state.endDate.trim() && !state.openEnded) {
    patch.endDate = endDateFromStartAndDays(state.startDate, duration);
  }

  const primaryFreq = items.find((i) => i.frequency)?.frequency ?? null;
  const every = frequencyToEveryDays(primaryFreq);

  if (state.planningMode === 'single_day' && every === 1) {
    patch.planningMode = 'interval';
    patch.everyDays = '1';
  } else if (state.planningMode === 'single_day' && every == null) {
    patch.planningMode = 'interval';
    patch.everyDays = String(PASSAGE_INTERVAL_DEFAULT_DAYS);
  }

  return Object.keys(patch).length > 0 ? patch : null;
}

function resolveEndDateInConfig(
  state: PassagePlanningFormState,
  items: NursePassageNursingItem[],
): string {
  const trimmed = state.endDate.trim();
  if (trimmed) return trimmed;
  const duration = maxCareDurationDays(items);
  if (duration != null && duration > 1) {
    return endDateFromStartAndDays(state.startDate, duration);
  }
  return '';
}

export function buildPlanningPayload(
  state: PassagePlanningFormState,
  items: NursePassageNursingItem[] = [],
): { planning_type: PassagePlanningType; planning_config: PassagePlanningConfig } {
  const endDate = resolveEndDateInConfig(state, items);

  if (state.planningMode === 'single_day') {
    return {
      planning_type: 'single_day',
      planning_config: {
        start_date: state.startDate,
        ...(endDate ? { end_date: endDate } : {}),
      },
    };
  }

  const planningType: PassagePlanningType = state.planningMode;

  if (planningType === 'interval') {
    const openEnded = state.openEnded && !endDate;
    return {
      planning_type: 'interval',
      planning_config: {
        start_date: state.startDate,
        every_days: Math.max(1, parseInt(state.everyDays, 10) || PASSAGE_INTERVAL_DEFAULT_DAYS),
        ...(endDate ? { end_date: endDate } : {}),
        ...(openEnded ? { open_ended: true } : {}),
      },
    };
  }

  if (planningType === 'weekdays') {
    const openEnded = state.openEnded && !endDate;
    return {
      planning_type: 'weekdays',
      planning_config: {
        start_date: state.startDate,
        weekdays: state.weekdays,
        ...(endDate ? { end_date: endDate } : {}),
        ...(openEnded ? { open_ended: true } : {}),
      },
    };
  }

  if (planningType === 'custom_dates') {
    return {
      planning_type: 'custom_dates',
      planning_config: { dates: state.customDates },
    };
  }

  return {
    planning_type: 'manual',
    planning_config: { start_date: state.startDate },
  };
}

export function planningStateFromSeries(
  planningType: PassagePlanningType,
  config: PassagePlanningConfig,
  fallbackStart: string,
): PassagePlanningFormState {
  const state = defaultPlanningFormState(fallbackStart);

  if (planningType === 'single_day' && 'start_date' in config) {
    state.planningMode = 'single_day';
    state.startDate = config.start_date ?? fallbackStart;
    state.endDate = 'end_date' in config ? String(config.end_date ?? '') : '';
  } else if (planningType === 'interval' && 'every_days' in config) {
    state.planningMode = 'interval';
    state.startDate = config.start_date ?? fallbackStart;
    state.everyDays = String(config.every_days ?? PASSAGE_INTERVAL_DEFAULT_DAYS);
    state.endDate = config.end_date ?? '';
    state.openEnded = Boolean((config as { open_ended?: boolean }).open_ended) && !state.endDate;
  } else if (planningType === 'weekdays' && 'weekdays' in config) {
    state.planningMode = 'weekdays';
    state.startDate = config.start_date ?? fallbackStart;
    state.weekdays = [...(config.weekdays ?? [])].sort((a, b) => a - b);
    state.endDate = config.end_date ?? '';
    state.openEnded = Boolean((config as { open_ended?: boolean }).open_ended) && !state.endDate;
  } else if (planningType === 'custom_dates' && 'dates' in config) {
    state.planningMode = 'custom_dates';
    state.customDates = [...(config.dates ?? [])].sort();
  } else if (planningType === 'manual') {
    state.planningMode = 'manual';
    state.startDate = 'start_date' in config ? String(config.start_date) : fallbackStart;
    state.endDate = 'end_date' in config ? String(config.end_date ?? '') : '';
  }

  return state;
}

/** Aperçu client — même logique que PassageDateExpander (PHP). */
export function previewPassageDates(
  planningType: PassagePlanningType,
  config: PassagePlanningConfig,
): string[] {
  const capEnd = (start: string, end?: string | null, openEnded?: boolean): string => {
    if (end?.trim()) return end.trim();
    const days = openEnded ? PASSAGE_OPEN_ENDED_HORIZON_DAYS : PASSAGE_MAX_DAYS_WITHOUT_END;
    return dayjs(start)
      .add(days - 1, 'day')
      .format('YYYY-MM-DD');
  };

  if (planningType === 'single_day' || planningType === 'manual') {
    const start = 'start_date' in config ? String(config.start_date) : '';
    if (!start) return [];
    const endRaw = 'end_date' in config ? String(config.end_date ?? '').trim() : '';
    if (!endRaw) return [start];
    const dates: string[] = [];
    let cursor = dayjs(start);
    const limit = dayjs(endRaw);
    while (cursor.isBefore(limit) || cursor.isSame(limit, 'day')) {
      dates.push(cursor.format('YYYY-MM-DD'));
      cursor = cursor.add(1, 'day');
    }
    return dates;
  }

  if (planningType === 'interval' && 'every_days' in config) {
    const start = config.start_date;
    const every = Math.max(1, config.every_days ?? PASSAGE_INTERVAL_DEFAULT_DAYS);
    const openEnded = Boolean((config as { open_ended?: boolean }).open_ended);
    const end = capEnd(start, config.end_date, openEnded);
    const dates: string[] = [];
    let cursor = dayjs(start);
    const limit = dayjs(end);
    while (cursor.isBefore(limit) || cursor.isSame(limit, 'day')) {
      dates.push(cursor.format('YYYY-MM-DD'));
      cursor = cursor.add(every, 'day');
    }
    return dates;
  }

  if (planningType === 'weekdays' && 'weekdays' in config) {
    const start = config.start_date;
    const openEnded = Boolean((config as { open_ended?: boolean }).open_ended);
    const end = capEnd(start, config.end_date, openEnded);
    const allowed = new Set(config.weekdays ?? []);
    const dates: string[] = [];
    let cursor = dayjs(start);
    const limit = dayjs(end);
    while (cursor.isBefore(limit) || cursor.isSame(limit, 'day')) {
      const jsDay = cursor.day();
      const iso = jsDay === 0 ? 7 : jsDay;
      if (allowed.has(iso)) dates.push(cursor.format('YYYY-MM-DD'));
      cursor = cursor.add(1, 'day');
    }
    return dates;
  }

  if (planningType === 'custom_dates' && 'dates' in config) {
    return [...(config.dates ?? [])].sort();
  }

  return [];
}

export function previewPassageCount(
  state: PassagePlanningFormState,
  items: NursePassageNursingItem[],
  dailySlotsCount = 1,
): number {
  const { planning_type, planning_config } = buildPlanningPayload(state, items);
  const dates = previewPassageDates(planning_type, planning_config).length;
  return dates * Math.max(1, dailySlotsCount);
}

export function embedTimeRangeInPlanningConfig(
  planningConfig: PassagePlanningConfig,
  timeRange: [number, number] | null | undefined,
  dailyTimeSlots?: PassageDailyTimeSlot[],
): PassagePlanningConfig {
  const base = { ...(planningConfig as Record<string, unknown>) };
  if (!timeRange) {
    delete base.time_range;
  } else {
    base.time_range = timeRange;
  }
  if (dailyTimeSlots && dailyTimeSlots.length > 0) {
    base.daily_time_slots = dailyTimeSlots;
  }
  return base as PassagePlanningConfig;
}
