import type { PatientAbsenceType } from '@oneandlab/shared-types';

export const PATIENT_ABSENCE_TYPE_LABELS: Record<PatientAbsenceType, string> = {
  hospitalization: 'Hospitalisé',
  leave: 'En congés',
  other: 'Absent',
};

export const PATIENT_ABSENCE_TYPE_OPTIONS: Array<{ value: PatientAbsenceType; label: string }> = [
  { value: 'hospitalization', label: 'Hospitalisation' },
  { value: 'leave', label: 'Congés / absence' },
  { value: 'other', label: 'Autre' },
];
