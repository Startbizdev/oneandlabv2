import { STAFF_ROLES_REQUIRING_PATIENT_BOOKING_CONSENT } from '@oneandlab/shared-constants';

/** Miroir de `AiBookingAccess::ROLES` : le préleveur crée ses demandes via « Demander un prélèvement ». */
const AI_BOOKING_ROLES: readonly string[] = ['patient', 'pro', 'nurse'];

const CONSENT_ROLES: readonly string[] = STAFF_ROLES_REQUIRING_PATIENT_BOOKING_CONSENT;

export function canBookWithCaryAi(role: string): boolean {
  return AI_BOOKING_ROLES.includes(role);
}

/** Infirmier / pro : la confirmation exige `patient_booking_consent` (`StaffPatientConsent::requiresConsent`). */
export function aiBookingRequiresPatientConsent(role: string): boolean {
  return canBookWithCaryAi(role) && CONSENT_ROLES.includes(role);
}
