import { isBloodTestAppointment } from '@oneandlab/shared-utils';

export type AppointmentDocFieldKey =
  | 'carte_vitale'
  | 'carte_mutuelle'
  | 'attestation_droits_ame'
  | 'ordonnance'
  | 'autres_assurances';

export type AppointmentDocFieldDef = {
  key: AppointmentDocFieldKey;
  label: string;
  hint?: string;
  optional?: boolean;
};

/** Carte Vitale / mutuelle — étape « Infos » patient ou nouveau patient staff. */
export const PERSONAL_DOC_FIELDS: AppointmentDocFieldDef[] = [
  { key: 'carte_vitale', label: 'Carte Vitale', optional: true },
  { key: 'carte_mutuelle', label: 'Carte mutuelle', optional: true },
  { key: 'attestation_droits_ame', label: 'Attestation de droits / AME', optional: true },
];

/** Documents dossier patient réutilisables sur un nouveau RDV (pas ordonnance / autre prescription). */
export const PROFILE_PREFILL_DOC_KEYS = new Set<AppointmentDocFieldKey>(
  PERSONAL_DOC_FIELDS.map((f) => f.key),
);

/** Ordre liste / téléchargement fiche RDV (mobile, tous rôles). */
export const APPOINTMENT_DETAIL_DOC_ORDER = [
  'carte_vitale',
  'carte_mutuelle',
  'attestation_droits_ame',
  'ordonnance',
  'autres_assurances',
  'resultats',
  'other',
] as const;

/** Ordonnance + complément — étape « Documents » (tous rôles). */
export const SERVICE_DOC_FIELDS: AppointmentDocFieldDef[] = [
  {
    key: 'ordonnance',
    label: 'Ordonnance',
    hint: 'PDF, JPG ou PNG — jusqu’à 25 Mo',
  },
  {
    key: 'autres_assurances',
    label: 'Autre prescription',
    optional: true,
    hint: 'Document complémentaire (facultatif)',
  },
];

export function serviceDocFieldsForType(serviceType?: string): AppointmentDocFieldDef[] {
  return SERVICE_DOC_FIELDS;
}

export function missingPrescriptionCopy(serviceType?: string): { title: string; description: string } {
  if (isBloodTestAppointment(serviceType ?? '')) {
    return {
      title: 'Prélèvement sans ordonnance médicale',
      description:
        'Sans prescription, la prise en charge par l’Assurance Maladie et votre complémentaire peut être refusée selon votre contrat.',
    };
  }
  return {
    title: 'Soins sans prescription médicale',
    description:
      'Sans ordonnance, la prise en charge par l’Assurance Maladie et votre complémentaire peut être refusée selon votre contrat.',
  };
}
