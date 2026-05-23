import type { AppointmentListFilters } from '@oneandlab/shared-types';

/** Mêmes filtres que `NurseDemandesScreen` — cache React Query partagé. */
export const NURSE_DEMANDES_LIST_FILTERS: AppointmentListFilters = {
  status: 'pending',
  nurse_tab: 'soins',
  nurse_segment: 'en_attente',
  limit: 20,
};
