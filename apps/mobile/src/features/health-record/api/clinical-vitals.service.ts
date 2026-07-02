import type {
  ClinicalVitalInput,
  ClinicalVitalReading,
  ClinicalVitalsHistoryResponse,
  ClinicalVitalsListResponse,
  ClinicalVitalType,
} from '@oneandlab/shared-types';
import { apiRequest } from '@/api/client';

export async function fetchClinicalVitals(patientId: string): Promise<ClinicalVitalsListResponse> {
  const res = await apiRequest<ClinicalVitalsListResponse>(
    `/patients/${encodeURIComponent(patientId)}/clinical-vitals`,
  );
  if (!res.success || !res.data) {
    throw new Error(res.error ?? 'Constantes indisponibles');
  }
  return res.data;
}

export async function createClinicalVital(
  patientId: string,
  input: ClinicalVitalInput,
): Promise<ClinicalVitalReading> {
  const res = await apiRequest<ClinicalVitalReading>(
    `/patients/${encodeURIComponent(patientId)}/clinical-vitals`,
    { method: 'POST', body: input },
  );
  if (!res.success || !res.data) {
    throw new Error(res.error ?? 'Enregistrement impossible');
  }
  return res.data;
}

export async function updateClinicalVital(
  patientId: string,
  vitalId: string,
  input: Partial<ClinicalVitalInput>,
): Promise<ClinicalVitalReading> {
  const res = await apiRequest<ClinicalVitalReading>(
    `/patients/${encodeURIComponent(patientId)}/clinical-vitals?vital_id=${encodeURIComponent(vitalId)}`,
    { method: 'PATCH', body: input },
  );
  if (!res.success || !res.data) {
    throw new Error(res.error ?? 'Mise à jour impossible');
  }
  return res.data;
}

export async function deleteClinicalVital(patientId: string, vitalId: string): Promise<void> {
  const res = await apiRequest(
    `/patients/${encodeURIComponent(patientId)}/clinical-vitals?vital_id=${encodeURIComponent(vitalId)}`,
    { method: 'DELETE' },
  );
  if (!res.success) {
    throw new Error(res.error ?? 'Suppression impossible');
  }
}

export async function fetchClinicalVitalHistory(
  patientId: string,
  vitalType: ClinicalVitalType,
  limit = 50,
): Promise<ClinicalVitalsHistoryResponse> {
  const res = await apiRequest<ClinicalVitalsHistoryResponse>(
    `/patients/${encodeURIComponent(patientId)}/clinical-vitals?vital_type=${encodeURIComponent(vitalType)}&limit=${limit}`,
  );
  if (!res.success || !res.data) {
    throw new Error(res.error ?? 'Historique indisponible');
  }
  return res.data;
}

export const clinicalVitalsQueryKey = (patientId: string) =>
  ['clinical-vitals', patientId] as const;

export const clinicalVitalHistoryQueryKey = (patientId: string, vitalType: ClinicalVitalType) =>
  ['clinical-vitals-history', patientId, vitalType] as const;
