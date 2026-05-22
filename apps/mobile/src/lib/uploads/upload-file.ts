import { api } from '@/api/client';

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export type UploadFileInput = {
  uri: string;
  fileName: string;
  mimeType?: string;
  /** Nom du champ multipart (défaut : file). */
  fieldName?: string;
};

export type MedicalDocumentMeta = {
  appointment_id?: string;
  document_type?: string;
  user_id?: string;
  relative_id?: string;
};

function guessMime(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.heic') || lower.endsWith('.heif')) return 'image/heic';
  return 'image/jpeg';
}

/** FormData multipart pour POST /medical-documents, /patient-documents/upload, care-photos, etc. */
export async function buildMedicalDocumentForm(
  file: UploadFileInput,
  meta: MedicalDocumentMeta,
): Promise<FormData> {
  const fd = new FormData();
  const field = file.fieldName ?? 'file';
  const mimeType = file.mimeType ?? guessMime(file.fileName);

  fd.append(field, {
    uri: file.uri,
    name: file.fileName,
    type: mimeType,
  } as unknown as Blob);

  if (meta.appointment_id) fd.append('appointment_id', meta.appointment_id);
  if (meta.document_type) fd.append('document_type', meta.document_type);
  if (meta.user_id) fd.append('user_id', meta.user_id);
  if (meta.relative_id) fd.append('relative_id', meta.relative_id);

  return fd;
}

export async function uploadFormData(path: string, formData: FormData): Promise<void> {
  const res = await api.postForm(path, formData);
  if (res.success === false) {
    throw new Error(res.error ?? res.message ?? 'Upload échoué');
  }
}

export { MAX_UPLOAD_BYTES };
