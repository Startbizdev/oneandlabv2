/** Numéro supplémentaire d'un patient (le principal reste `phone` du profil) — `GET/POST/DELETE /patients/:id/phones`. */
export type PatientPhoneLabel = 'mobile' | 'fixe' | 'aidant' | 'autre';

export interface PatientPhone {
  id: string;
  patient_id: string;
  label: PatientPhoneLabel;
  phone: string;
  created_at: string;
}

export interface PatientPhoneInput {
  label: PatientPhoneLabel;
  phone: string;
}

/** Ordre d'affichage et libellés, miroir de `PatientPhoneService::LABELS` (backend/lib/health). */
export const PATIENT_PHONE_LABELS: readonly { value: PatientPhoneLabel; label_fr: string }[] = [
  { value: 'mobile', label_fr: 'Mobile' },
  { value: 'fixe', label_fr: 'Fixe' },
  { value: 'aidant', label_fr: 'Aidant' },
  { value: 'autre', label_fr: 'Autre' },
];
