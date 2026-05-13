export type AppointmentTypeLike = string | null | undefined;

/** Cartes / listes : plusieurs actes de prélèvement sur un même RDV laboratoire (`blood_test_items.length > 1`). */
export const MULTI_BLOOD_TEST_ITEMS_CARD_LABEL = 'Prélèvement laboratoire';

/** Plusieurs actes infirmiers sur un même RDV (`nursing_items_display.length > 1`). */
export const MULTI_NURSING_ITEMS_CARD_LABEL = 'Soins infirmiers';

export function isBloodTestAppointment(type: AppointmentTypeLike): boolean {
  return String(type || '') === 'blood_test';
}

export function isNursingAppointment(type: AppointmentTypeLike): boolean {
  const normalized = String(type || '');
  return normalized === 'nursing' || normalized === 'nurse';
}

export function usesUnifiedAppointmentItems(type: AppointmentTypeLike): boolean {
  return isBloodTestAppointment(type) || isNursingAppointment(type);
}

/** Icônes pour le choix « préférence genre infirmier » (radio). */
export function iconForPreferredNurseGenderPreference(value: unknown): string {
  const v = String(value ?? '');
  if (v === 'female') return 'i-lucide-venus';
  if (v === 'male') return 'i-lucide-mars';
  return 'i-lucide-users';
}
