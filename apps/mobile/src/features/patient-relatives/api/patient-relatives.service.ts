import { api } from '@/api/client';

import type { AddressPayload } from '@/features/appointments/form/types';

export interface PatientRelative {
  id: string;
  first_name?: string;
  last_name?: string;
  birth_date?: string;
  gender?: string;
  /** Libellé affiché (API liste) */
  relationship?: string;
  relationship_type?: string;
  email?: string;
  phone?: string;
  address?: AddressPayload | null;
}

export function relativeRelationshipType(r: PatientRelative): string {
  return (r.relationship_type ?? r.relationship ?? '').trim();
}

export async function fetchPatientRelatives(patientId?: string) {
  const query = patientId ? `?patient_id=${encodeURIComponent(patientId)}` : '';
  return api.get<PatientRelative[]>(`/patient-relatives${query}`);
}

export async function fetchPatientRelative(id: string, patientId?: string) {
  const query = patientId ? `?patient_id=${encodeURIComponent(patientId)}` : '';
  return api.get<PatientRelative>(`/patient-relatives/${id}${query}`);
}

export async function createPatientRelative(body: {
  first_name: string;
  last_name: string;
  relationship_type: string;
  gender?: string | null;
  birth_date?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: AddressPayload | null;
  patient_id?: string;
  patient_booking_consent?: boolean;
}) {
  const response = await api.post<PatientRelative>('/patient-relatives', body);
  if (!response.success) throw new Error(response.error ?? 'Impossible d’ajouter le proche');
  return response;
}

export async function updatePatientRelative(
  id: string,
  body: Partial<{
    first_name: string;
    last_name: string;
    relationship_type: string;
    gender: string | null;
    birth_date: string | null;
    email: string | null;
    phone: string | null;
    address: AddressPayload | null;
  }>,
) {
  const response = await api.put<PatientRelative>(`/patient-relatives/${encodeURIComponent(id)}`, body);
  if (!response.success) throw new Error(response.error ?? 'Impossible de modifier le proche');
  return response;
}

export async function deletePatientRelative(id: string) {
  const response = await api.delete(`/patient-relatives/${encodeURIComponent(id)}`);
  if (!response.success) throw new Error(response.error ?? 'Impossible de supprimer le proche');
  return response;
}
