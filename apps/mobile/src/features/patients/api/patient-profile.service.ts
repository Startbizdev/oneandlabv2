import { api } from '@/api/client';
import { buildMedicalDocumentForm, uploadFormData } from '@/lib/uploads/upload-file';
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
  const fd = await buildMedicalDocumentForm(
    { uri: file.uri, fileName: file.fileName, mimeType: file.mimeType },
    { user_id: patientUserId, document_type: docType },
  );
  await uploadFormData('/patient-documents/upload', fd);
}

export const RELATIVE_PROFILE_UPLOAD_TYPES = [
  'carte_vitale',
  'carte_mutuelle',
  'ordonnance',
] as const;

export type RelativeProfileUploadType = (typeof RELATIVE_PROFILE_UPLOAD_TYPES)[number];

export async function uploadRelativeProfileDocument(
  relativeId: string,
  docType: RelativeProfileUploadType,
  file: { uri: string; fileName: string; mimeType: string },
): Promise<void> {
  const fd = await buildMedicalDocumentForm(
    { uri: file.uri, fileName: file.fileName, mimeType: file.mimeType },
    { relative_id: relativeId, document_type: docType },
  );
  await uploadFormData('/patient-documents/upload', fd);
}

export async function fetchPatientProfile(userId: string) {
  return api.get<PatientProfile>(`/users/${userId}`);
}

export async function fetchPatientHistory(patientId: string, page = 1, limit = 20) {
  return api.get<Appointment[]>(
    `/patient-history?patient_id=${encodeURIComponent(patientId)}&page=${page}&limit=${limit}`,
  );
}

export async function fetchPatientDocuments(userId: string) {
  return fetchProfileDocuments({ userId });
}

export type FetchProfileDocumentsParams = {
  userId?: string;
  relativeId?: string;
};

/** Dossier patient connecté, proche, ou patient staff (aligné web GET /patient-documents). */
export async function fetchProfileDocuments(params: FetchProfileDocumentsParams) {
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
