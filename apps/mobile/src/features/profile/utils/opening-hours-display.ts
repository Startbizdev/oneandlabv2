import type { OpeningHoursMap } from '@/features/profile/types/public-profile.types';

const DAY_LABELS: Record<string, string> = {
  monday: 'Lundi',
  tuesday: 'Mardi',
  wednesday: 'Mercredi',
  thursday: 'Jeudi',
  friday: 'Vendredi',
  saturday: 'Samedi',
  sunday: 'Dimanche',
};

const DAY_ORDER = Object.keys(DAY_LABELS);

export type OpeningHoursRow = {
  key: string;
  label: string;
  value: string;
};

export function openingHoursRows(hours?: OpeningHoursMap | null): OpeningHoursRow[] {
  if (!hours || typeof hours !== 'object') return [];

  return DAY_ORDER.flatMap((key) => {
    const slot = hours[key];
    const start = slot?.start?.trim() ?? '';
    const end = slot?.end?.trim() ?? '';
    if (!start && !end) return [];
    const value =
      start && end ? `${start} – ${end}` : start || end || 'Fermé';
    return [{ key, label: DAY_LABELS[key] ?? key, value }];
  });
}
