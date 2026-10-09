import type {
  PatientTransmission,
  PatientTransmissionInput,
  PatientTransmissionsPage,
  TransmissionCareItemsForDate,
} from '@oneandlab/shared-types';
import { apiRequest } from '@/api/client';

function transmissionsPath(patientId: string): string {
  return `/patients/${encodeURIComponent(patientId)}/transmissions`;
}

/** Fil paginé par jour : `before` (Y-m-d exclu) charge les jours plus anciens. */
export async function fetchPatientTransmissions(
  patientId: string,
  before: string | null,
): Promise<PatientTransmissionsPage> {
  const query = before ? `?before=${encodeURIComponent(before)}` : '';
  const res = await apiRequest<PatientTransmissionsPage>(`${transmissionsPath(patientId)}${query}`);
  if (!res.success || !res.data) {
    throw new Error(res.error ?? 'Transmissions indisponibles');
  }
  return res.data;
}

export async function createPatientTransmission(
  patientId: string,
  input: PatientTransmissionInput,
): Promise<PatientTransmission> {
  const res = await apiRequest<PatientTransmission>(transmissionsPath(patientId), { method: 'POST', body: input });
  if (!res.success || !res.data) {
    throw new Error(res.error ?? 'Enregistrement de la transmission impossible');
  }
  return res.data;
}

export async function updatePatientTransmission(
  patientId: string,
  transmissionId: string,
  input: PatientTransmissionInput,
): Promise<PatientTransmission> {
  const res = await apiRequest<PatientTransmission>(
    `${transmissionsPath(patientId)}?transmission_id=${encodeURIComponent(transmissionId)}`,
    { method: 'PATCH', body: input },
  );
  if (!res.success || !res.data) {
    throw new Error(res.error ?? 'Modification de la transmission impossible');
  }
  return res.data;
}

/** Soins proposés à la saisie : ceux des passages du jour, sinon le catalogue des soins infirmiers. */
export async function fetchTransmissionCareItems(
  patientId: string,
  date: string,
): Promise<TransmissionCareItemsForDate> {
  const res = await apiRequest<TransmissionCareItemsForDate>(
    `/patients/${encodeURIComponent(patientId)}/transmission-care-items?date=${encodeURIComponent(date)}`,
  );
  if (!res.success || !res.data) {
    throw new Error(res.error ?? 'Soins indisponibles');
  }
  return res.data;
}
