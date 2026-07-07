/** Créneaux horaires passage infirmier (Europe/Paris). */
export type PassageTimeSlot =
  | 'morning'
  | 'noon'
  | 'afternoon'
  | 'evening'
  | 'night'
  | 'custom'
  | 'all_day';

export type PassagePlanningType =
  | 'single_day'
  | 'interval'
  | 'weekdays'
  | 'custom_dates'
  | 'manual';

export type PassageSource = 'nurse_passage' | 'booking' | 'staff_wizard';

export type PassageTourViewTab = 'intelligent' | 'manual';

export interface PassageIntervalConfig {
  every_days: number;
  start_date: string;
  end_date?: string | null;
}

export interface PassageWeekdaysConfig {
  /** 1 = lundi … 7 = dimanche (ISO) */
  weekdays: number[];
  start_date: string;
  end_date?: string | null;
}

export interface PassageCustomDatesConfig {
  dates: string[];
}

export type PassagePlanningConfig =
  | PassageIntervalConfig
  | PassageWeekdaysConfig
  | PassageCustomDatesConfig
  | { start_date: string; time_range?: [number, number] };

export interface NursePassageNursingItem {
  category_id: string;
  label?: string | null;
  care_options?: Record<string, string | number>;
  /** Durée prise en charge (aligné booking infirmier). */
  duration_days?: string | null;
  custom_days?: number | null;
  frequency?: string | null;
}

export interface NursePassageSeriesInput {
  patient_id: string;
  planning_type: PassagePlanningType;
  planning_config: PassagePlanningConfig;
  time_slot: PassageTimeSlot;
  custom_time?: string | null;
  /** Plage horaire (heures Paris) — persistée dans planning_config.time_range. */
  time_range?: [number, number] | null;
  duration_minutes: number;
  at_home?: boolean;
  nursing_items: NursePassageNursingItem[];
  notes?: string | null;
}

export interface NursePassageSeries {
  id: string;
  nurse_id: string;
  patient_id: string;
  planning_type: PassagePlanningType;
  planning_config: PassagePlanningConfig;
  time_slot: PassageTimeSlot;
  custom_time?: string | null;
  duration_minutes: number;
  at_home: boolean;
  nursing_items: NursePassageNursingItem[];
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  appointment_count?: number;
  first_date?: string | null;
  last_date?: string | null;
}

export interface NursePassageSeriesCreateResult {
  series_id: string;
  created_appointments: number;
  appointment_ids: string[];
  first_date: string | null;
  last_date: string | null;
}

/** Heures nominales Paris (validées produit v1). */
export const PASSAGE_SLOT_DEFAULT_HOURS: Record<
  Exclude<PassageTimeSlot, 'custom'>,
  { hour: number; minute: number }
> = {
  all_day: { hour: 9, minute: 0 },
  morning: { hour: 8, minute: 0 },
  noon: { hour: 12, minute: 0 },
  afternoon: { hour: 15, minute: 0 },
  evening: { hour: 18, minute: 0 },
  night: { hour: 21, minute: 0 },
};

export const PASSAGE_DURATION_PRESETS = [15, 30, 60] as const;

export const PASSAGE_MAX_DAYS_WITHOUT_END = 90;

export const PASSAGE_INTERVAL_DEFAULT_DAYS = 3;
