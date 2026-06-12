import { api } from '@/api/client';
import { uploadMedicalDocument } from '@/lib/uploads/upload-file';
import { fetchAppointmentsPaginated } from '@/features/appointments/api/appointments.service';
import type { Appointment } from '@oneandlab/shared-types';

export type PatientProfile = {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  email_display?: string | null;
  phone?: string;
  birth_date?: string;
  gender?: string;
  profile_image_url?: string | null;
  address?: Record<string, unknown>;
  created_by?: string;
};

export type PatientDocumentRow = {
  id: string;
  medical_document_id?: string;
  document_type?: string;
  file_name?: string;
  created_at?: string;
  source?: 'profile' | 'appointment';
  appointment_id?: string;
  appointment_scheduled_at?: string;
};

export const PATIENT_PROFILE_UPLOAD_TYPES = [
  'carte_vitale',
  'carte_mutuelle',
  'autres_assurances',
] as const;

export type PatientProfileUploadType = (typeof PATIENT_PROFILE_UPLOAD_TYPES)[number];

export async function uploadPatientProfileDocument(
  patientUserId: string,
  docType: PatientProfileUploadType,
  file: { uri: string; fileName: string; mimeType: string },
): Promise<void> {
  await uploadMedicalDocument(
    { uri: file.uri, fileName: file.fileName, mimeType: file.mimeType },
    { user_id: patientUserId, document_type: docType },
    '/patient-documents/upload',
  );
}

export const RELATIVE_PROFILE_UPLOAD_TYPES = [
  'carte_vitale',
  'carte_mutuelle',
] as const;

export type RelativeProfileUploadType = (typeof RELATIVE_PROFILE_UPLOAD_TYPES)[number];

export async function uploadRelativeProfileDocument(
  relativeId: string,
  docType: RelativeProfileUploadType,
  file: { uri: string; fileName: string; mimeType: string },
): Promise<void> {
  await uploadMedicalDocument(
    { uri: file.uri, fileName: file.fileName, mimeType: file.mimeType },
    { relative_id: relativeId, document_type: docType },
    '/patient-documents/upload',
  );
}

export async function fetchPatientProfile(userId: string) {
  return api.get<PatientProfile>(`/users/${userId}`);
}

export async function fetchPatientHistory(patientId: string, page = 1, limit = 20) {
  return api.get<Appointment[]>(
    `/patient-history?patient_id=${encodeURIComponent(patientId)}&page=${page}&limit=${limit}`,
  );
}

/** Historique dossier patient staff — même payload déchiffré que la liste RDV (créneaux, soins, assignés). */
export async function fetchStaffPatientHistoryAppointments(patientId: string) {
  const { appointments, pagination } = await fetchAppointmentsPaginated({
    patient_id: patientId,
    page: 1,
    limit: 120,
  });
  return { appointments, total: pagination.total };
}

export async function fetchPatientDocuments(userId: string) {
  return fetchProfileDocuments({ userId });
}

export type FetchProfileDocumentsParams = {
  userId?: string;
  relativeId?: string;
};

/** Fusionne un document profil dans la liste cache (après upload). */
export function mergePatientDocumentRow(
  rows: PatientDocumentRow[] | undefined,
  uploaded: { id: string; file_name?: string; document_type: string },
): PatientDocumentRow[] {
  const base = rows ?? [];
  const without = base.filter((r) => r.document_type !== uploaded.document_type);
  return [
    ...without,
    {
      id: uploaded.id,
      medical_document_id: uploaded.id,
      document_type: uploaded.document_type,
      file_name: uploaded.file_name,
      created_at: new Date().toISOString(),
      source: 'profile' as const,
    },
  ];
}

/** Dossier patient connecté, proche, ou patient staff (aligné web GET /patient-documents). */
export async function fetchProfileDocuments(params: FetchProfileDocumentsParams = {}) {
  const qs = new URLSearchParams();
  if (params.relativeId) {
    qs.set('relative_id', params.relativeId);
  } else if (params.userId) {
    qs.set('user_id', params.userId);
  }
  const query = qs.toString();
  return api.get<PatientDocumentRow[]>(
    query ? `/patient-documents?${query}` : '/patient-documents',
  );
}

export function mapProfileDocumentsByType(
  rows: PatientDocumentRow[] | undefined,
): Record<string, PatientDocumentRow> {
  const map: Record<string, PatientDocumentRow> = {};
  for (const row of rows ?? []) {
    const t = row.document_type;
    if (t && !map[t]) map[t] = row;
  }
  return map;
}
