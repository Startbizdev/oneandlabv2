import type { PatientPhone, PatientPhoneInput } from '@oneandlab/shared-types';
import { apiRequest } from '@/api/client';

export async function fetchPatientPhones(patientId: string): Promise<PatientPhone[]> {
  const res = await apiRequest<PatientPhone[]>(`/patients/${encodeURIComponent(patientId)}/phones`);
  if (!res.success || !res.data) {
    throw new Error(res.error ?? 'Numéros indisponibles');
  }
  return res.data;
}

export async function addPatientPhone(patientId: string, input: PatientPhoneInput): Promise<PatientPhone> {
  const res = await apiRequest<PatientPhone>(`/patients/${encodeURIComponent(patientId)}/phones`, {
    method: 'POST',
    body: input,
  });
  if (!res.success || !res.data) {
    throw new Error(res.error ?? 'Ajout du numéro impossible');
  }
  return res.data;
}

export async function deletePatientPhone(patientId: string, phoneId: string): Promise<void> {
  const res = await apiRequest(
    `/patients/${encodeURIComponent(patientId)}/phones?phone_id=${encodeURIComponent(phoneId)}`,
    { method: 'DELETE' },
  );
  if (!res.success) {
    throw new Error(res.error ?? 'Suppression du numéro impossible');
  }
}
