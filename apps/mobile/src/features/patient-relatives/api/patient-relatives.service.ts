import { api } from '@/api/client';

export interface PatientRelative {
  id: string;
  first_name?: string;
  last_name?: string;
  birth_date?: string;
  gender?: string;
  relationship?: string;
  relationship_type?: string;
  email?: string;
  phone?: string;
}

export async function fetchPatientRelatives() {
  return api.get<PatientRelative[]>('/patient-relatives');
}

export async function createPatientRelative(body: {
  first_name: string;
  last_name: string;
  relationship_type: string;
  gender?: string;
  birth_date?: string;
  email?: string;
  phone?: string;
}) {
  return api.post<PatientRelative>('/patient-relatives', body);
}

export async function deletePatientRelative(id: string) {
  return api.delete(`/patient-relatives/${id}`);
}
