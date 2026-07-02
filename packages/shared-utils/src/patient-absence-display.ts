import type { PatientAbsenceType } from '@oneandlab/shared-types';
import { PATIENT_ABSENCE_TYPE_LABELS } from '@oneandlab/shared-constants';

export function patientAbsenceTypeLabel(type: PatientAbsenceType | string): string {
  return PATIENT_ABSENCE_TYPE_LABELS[type as PatientAbsenceType] ?? 'Absent';
}

export function formatPatientAbsenceCardLabel(
  type: PatientAbsenceType | string,
  endDate: string,
  locale = 'fr-FR',
): string {
  const label = patientAbsenceTypeLabel(type);
  const end = formatAbsenceEndDateShort(endDate, locale);
  return end ? `${label} · jusqu'au ${end}` : label;
}

export function formatAbsenceEndDateShort(isoDate: string, locale = 'fr-FR'): string {
  const t = isoDate.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return '';
  const d = new Date(`${t}T12:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
}
