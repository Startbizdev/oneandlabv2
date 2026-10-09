import type { PatientAbsence, PatientAbsenceType } from '@oneandlab/shared-types';
import { PATIENT_ABSENCE_TYPE_LABELS } from '@oneandlab/shared-constants';

export const PATIENT_ABSENCE_OPEN_END_LABEL = "jusqu'à nouvel ordre";

export function patientAbsenceTypeLabel(type: PatientAbsenceType | string): string {
  return PATIENT_ABSENCE_TYPE_LABELS[type as PatientAbsenceType] ?? 'Absent';
}

export function formatPatientAbsenceCardLabel(
  type: PatientAbsenceType | string,
  endDate: string | null,
  locale = 'fr-FR',
): string {
  const label = patientAbsenceTypeLabel(type);
  if (endDate === null) return `${label} · ${PATIENT_ABSENCE_OPEN_END_LABEL}`;
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

/** Absence couvrant le jour `isoDate` (AAAA-MM-JJ) ; sans fin, elle court jusqu'à nouvel ordre. */
export function isPatientAbsenceActiveOn(
  absence: Pick<PatientAbsence, 'start_date' | 'end_date'>,
  isoDate: string,
): boolean {
  const day = isoDate.slice(0, 10);
  if (absence.start_date.slice(0, 10) > day) return false;
  return absence.end_date === null || absence.end_date.slice(0, 10) >= day;
}
