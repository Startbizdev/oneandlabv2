import { apiRequest } from '@/api/client';
import type { PatientAbsence, PatientAbsenceInput } from '@oneandlab/shared-types';

export async function fetchPatientAbsences(
  patientId: string,
  activeOnly = false,
): Promise<PatientAbsence[]> {
  const qs = activeOnly ? '?active=1' : '';
  const res = await apiRequest<PatientAbsence[]>(
    `/nurse/patients/${encodeURIComponent(patientId)}/absences${qs}`,
  );
  if (!res.success || !Array.isArray(res.data)) {
    throw new Error(res.error ?? 'Absences indisponibles');
  }
  return res.data;
}

export async function createPatientAbsence(
  patientId: string,
  input: PatientAbsenceInput,
): Promise<PatientAbsence> {
  const res = await apiRequest<PatientAbsence>(
    `/nurse/patients/${encodeURIComponent(patientId)}/absences`,
    { method: 'POST', body: input },
  );
  if (!res.success || !res.data) throw new Error(res.error ?? 'Enregistrement impossible');
  return res.data;
}

export async function updatePatientAbsence(
  patientId: string,
  absenceId: string,
  input: Partial<PatientAbsenceInput>,
): Promise<PatientAbsence> {
  const res = await apiRequest<PatientAbsence>(
    `/nurse/patients/${encodeURIComponent(patientId)}/absences/${encodeURIComponent(absenceId)}`,
    { method: 'PATCH', body: input },
  );
  if (!res.success || !res.data) throw new Error(res.error ?? 'Mise à jour impossible');
  return res.data;
}

export async function deletePatientAbsence(patientId: string, absenceId: string): Promise<void> {
  const res = await apiRequest<unknown>(
    `/nurse/patients/${encodeURIComponent(patientId)}/absences/${encodeURIComponent(absenceId)}`,
    { method: 'DELETE' },
  );
  if (!res.success) throw new Error(res.error ?? 'Suppression impossible');
}
