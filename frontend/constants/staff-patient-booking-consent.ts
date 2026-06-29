/** Aligné avec @oneandlab/shared-constants/staff-patient-booking-consent */
export const STAFF_ROLES_REQUIRING_PATIENT_BOOKING_CONSENT = [
  'pro',
  'nurse',
  'lab',
  'subaccount',
] as const;

export const STAFF_PATIENT_BOOKING_CONSENT_LABEL =
  'Je confirme que le patient a donné son accord pour la prise de rendez-vous en son nom et j’accepte les conditions RGPD/HDS relatives au traitement de ses données de santé dans ce cadre.';

export const STAFF_PATIENT_BOOKING_CONSENT_ERROR =
  'Veuillez confirmer le consentement du patient pour la prise de rendez-vous.';
