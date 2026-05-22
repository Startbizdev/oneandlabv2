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

export async function fetchPatientRelatives() {
  return api.get<PatientRelative[]>('/patient-relatives');
}

export async function fetchPatientRelative(id: string) {
  return api.get<PatientRelative>(`/patient-relatives/${id}`);
}

export async function createPatientRelative(body: {
  first_name: string;
  last_name: string;
  relationship_type: string;
  gender?: string;
  birth_date?: string;
  email?: string;
  phone?: string;
  address?: AddressPayload | null;
}) {
  return api.post<PatientRelative>('/patient-relatives', body);
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
  return api.put<PatientRelative>(`/patient-relatives/${id}`, body);
}

export async function deletePatientRelative(id: string) {
  return api.delete(`/patient-relatives/${id}`);
}
