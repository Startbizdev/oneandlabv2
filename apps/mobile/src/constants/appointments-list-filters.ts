/** Filtres liste infirmier — aligné web `frontend/constants/nurse-appointments-filters.ts` */
export type NurseListTab = 'soins' | 'demandes';
export type NurseSegment =
  | 'tous'
  | 'acceptes'
  | 'en_attente'
  | 'envoyes'
  | 'offres'
  | 'tour'
  | 'historique'
  | 'relais';

export const NURSE_TAB_OPTIONS: Array<{ label: string; value: NurseListTab; hint: string }> = [
  {
    label: 'Mes soins',
    value: 'soins',
    hint: 'Soins infirmiers : acceptés, en attente, historique…',
  },
  {
    label: 'Bilans sanguins',
    value: 'demandes',
    hint: 'Prises de sang que vous avez créées pour un patient.',
  },
];

export const NURSE_SEGMENT_OPTIONS: Array<{ value: NurseSegment; label: string; hint?: string }> = [
  { value: 'tous', label: 'Tous les statuts' },
  { value: 'acceptes', label: 'Soins acceptés' },
  { value: 'en_attente', label: 'Soins en attente' },
  { value: 'envoyes', label: 'Soins envoyés' },
  { value: 'historique', label: 'Historique' },
  { value: 'relais', label: 'Relais' },
];

export function normalizeNurseSegment(raw: string): NurseSegment {
  if (raw === 'offres') return 'en_attente';
  if (raw === 'tour') return 'acceptes';
  if (raw === 'dispatches') return 'tous';
  const ok = NURSE_SEGMENT_OPTIONS.some((o) => o.value === raw);
  return ok ? (raw as NurseSegment) : 'tous';
}

/** Patient — prochains / passés (filtrage client). */
export type PatientListTab = 'upcoming' | 'past';

/** Pro — statuts simplifiés. */
export type ProStatusFilter = 'all' | 'pending' | 'active' | 'done';

export const PRO_STATUS_OPTIONS: Array<{ label: string; value: ProStatusFilter }> = [
  { label: 'Tous', value: 'all' },
  { label: 'En attente', value: 'pending' },
  { label: 'En cours', value: 'active' },
  { label: 'Terminés', value: 'done' },
];
