/** Rôles staff qui doivent confirmer le consentement du patient (ajout patient + prise de RDV). */
export const STAFF_ROLES_REQUIRING_PATIENT_BOOKING_CONSENT = [
  'pro',
  'nurse',
  'lab',
  'subaccount',
] as const;

export type StaffRoleRequiringPatientBookingConsent =
  (typeof STAFF_ROLES_REQUIRING_PATIENT_BOOKING_CONSENT)[number];

export const STAFF_PATIENT_BOOKING_CONSENT_LABEL =
  'Je confirme que le patient a donné son accord pour la prise de rendez-vous en son nom et j’accepte les conditions RGPD/HDS relatives au traitement de ses données de santé dans ce cadre.';

export const STAFF_PATIENT_BOOKING_CONSENT_ERROR =
  'Veuillez confirmer le consentement du patient pour la prise de rendez-vous.';
