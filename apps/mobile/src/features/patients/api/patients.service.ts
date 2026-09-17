import { api } from '@/api/client';
import type { PatientRow } from './fetch-all-patients';

export async function fetchPatients(page = 1, limit = 50) {
  return api.get<PatientRow[]>(`/patients?page=${page}&limit=${limit}`);
}

export async function createPatient(body: Record<string, unknown>) {
  return api.post<PatientRow>('/patients', body);
}

/** POST /patients/adopt — lien PPA après « Utiliser ce dossier ». */
export async function adoptStaffPatient(patientId: string) {
  return api.post<{ patient_id: string }>('/patients/adopt', { patient_id: patientId });
}

/** Mise à jour fiche patient staff — route PUT /users/:id (pas /patients/:id). */
export async function updatePatient(id: string, body: Record<string, unknown>) {
  return api.put<PatientRow>(`/users/${id}`, body);
}

export async function deletePatient(id: string) {
  return api.delete(`/patients/${id}`);
}
