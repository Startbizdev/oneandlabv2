import type { PatientAbsence, PatientAbsenceInput } from '@oneandlab/shared-types';
import { apiFetch } from '~/utils/api';

export async function fetchPatientAbsencesWeb(
  patientId: string,
  activeOnly = false,
): Promise<PatientAbsence[]> {
  const qs = activeOnly ? '?active=1' : '';
  const res = await apiFetch<PatientAbsence[]>(
    `/nurse/patients/${encodeURIComponent(patientId)}/absences${qs}`,
    { method: 'GET' },
  );
  if (!res?.success || !Array.isArray(res.data)) {
    throw new Error(res?.error ?? 'Absences indisponibles');
  }
  return res.data;
}

export async function createPatientAbsenceWeb(
  patientId: string,
  input: PatientAbsenceInput,
): Promise<PatientAbsence> {
  const res = await apiFetch<PatientAbsence>(
    `/nurse/patients/${encodeURIComponent(patientId)}/absences`,
    { method: 'POST', body: input },
  );
  if (!res?.success || !res.data) throw new Error(res?.error ?? 'Enregistrement impossible');
  return res.data;
}

export async function updatePatientAbsenceWeb(
  patientId: string,
  absenceId: string,
  input: Partial<PatientAbsenceInput>,
): Promise<PatientAbsence> {
  const res = await apiFetch<PatientAbsence>(
    `/nurse/patients/${encodeURIComponent(patientId)}/absences/${encodeURIComponent(absenceId)}`,
    { method: 'PATCH', body: input },
  );
  if (!res?.success || !res.data) throw new Error(res?.error ?? 'Mise à jour impossible');
  return res.data;
}

export async function deletePatientAbsenceWeb(patientId: string, absenceId: string): Promise<void> {
  const res = await apiFetch<unknown>(
    `/nurse/patients/${encodeURIComponent(patientId)}/absences/${encodeURIComponent(absenceId)}`,
    { method: 'DELETE' },
  );
  if (!res?.success) throw new Error(res?.error ?? 'Suppression impossible');
}

export function usePatientAbsenceWeb() {
  const saving = ref(false);
  const error = ref<string | null>(null);

  async function saveAbsence(
    patientId: string,
    input: PatientAbsenceInput,
    absenceId?: string | null,
  ): Promise<PatientAbsence> {
    saving.value = true;
    error.value = null;
    try {
      if (absenceId) return await updatePatientAbsenceWeb(patientId, absenceId, input);
      return await createPatientAbsenceWeb(patientId, input);
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur';
      throw e;
    } finally {
      saving.value = false;
    }
  }

  async function removeAbsence(patientId: string, absenceId: string): Promise<void> {
    saving.value = true;
    error.value = null;
    try {
      await deletePatientAbsenceWeb(patientId, absenceId);
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur';
      throw e;
    } finally {
      saving.value = false;
    }
  }

  return { saving, error, saveAbsence, removeAbsence };
}
