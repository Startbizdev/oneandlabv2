import { api } from '@/api/client';
import type { PatientRow } from './fetch-all-patients';

/** GET /patients/lookup?email= | ?phone= */
export async function lookupPatientByEmail(email: string) {
  return api.get<PatientRow>(`/patients/lookup?email=${encodeURIComponent(email.trim())}`);
}

export async function lookupPatientByPhone(phone: string) {
  return api.get<PatientRow>(`/patients/lookup?phone=${encodeURIComponent(phone.trim())}`);
}
