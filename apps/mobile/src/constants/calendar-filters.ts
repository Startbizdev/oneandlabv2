/** Filtres calendrier — statut API + type de soin. */
export type CalendarStatusFilter = '' | 'pending' | 'confirmed' | 'completed' | 'canceled';

export const CALENDAR_STATUS_OPTIONS: Array<{ label: string; value: CalendarStatusFilter }> = [
  { label: 'Tous', value: '' },
  { label: 'En attente', value: 'pending' },
  { label: 'Confirmés', value: 'confirmed' },
  { label: 'Terminés', value: 'completed' },
];

export type CalendarTypeFilter = '' | 'nursing' | 'blood_test';

export const CALENDAR_TYPE_OPTIONS: Array<{ label: string; value: CalendarTypeFilter }> = [
  { label: 'Tous les types', value: '' },
  { label: 'Soins infirmiers', value: 'nursing' },
  { label: 'Bilans sanguins', value: 'blood_test' },
];
