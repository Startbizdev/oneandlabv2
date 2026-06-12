import { api } from '@/api/client';
import { seedMedicalDocumentCache } from '@/lib/downloads/download-medical-document';
import { MAX_UPLOAD_BYTES } from './upload-limits';
import { prepareMedicalUploadFile } from './prepare-upload-file';
import { inspectMedDocFile, logMedDoc } from './medical-doc-file-debug';

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
  patient_id?: string;
  prescription_kind?: string;
  prescription_text?: string;
  prescription_number?: string;
};

export type UploadedMedicalDocument = {
  id: string;
  file_name?: string;
  document_type?: string;
  mime_type?: string;
  file_size?: number;
};

function guessMime(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.heic') || lower.endsWith('.heif')) return 'image/heic';
  return 'image/jpeg';
}

function buildFormDataFromPrepared(prepared: UploadFileInput, meta: MedicalDocumentMeta): FormData {
  const fd = new FormData();
  const field = prepared.fieldName ?? 'file';
  const mimeType = prepared.mimeType ?? guessMime(prepared.fileName);

  fd.append(field, {
    uri: prepared.uri,
    name: prepared.fileName,
    type: mimeType,
  } as unknown as Blob);

  if (meta.appointment_id) fd.append('appointment_id', meta.appointment_id);
  if (meta.document_type) fd.append('document_type', meta.document_type);
  if (meta.user_id) fd.append('user_id', meta.user_id);
  if (meta.relative_id) fd.append('relative_id', meta.relative_id);
  if (meta.patient_id) fd.append('patient_id', meta.patient_id);
  if (meta.prescription_kind) fd.append('prescription_kind', meta.prescription_kind);
  if (meta.prescription_text) fd.append('prescription_text', meta.prescription_text);
  if (meta.prescription_number) fd.append('prescription_number', meta.prescription_number);

  return fd;
}

function parseUploadedMedicalDocument(
  data: Record<string, unknown> | undefined,
): UploadedMedicalDocument | null {
  if (!data) return null;
  const id =
    typeof data.id === 'string'
      ? data.id
      : typeof data.medical_document_id === 'string'
        ? data.medical_document_id
        : null;
  if (!id) return null;
  return {
    id,
    file_name: typeof data.file_name === 'string' ? data.file_name : undefined,
    document_type: typeof data.document_type === 'string' ? data.document_type : undefined,
    mime_type: typeof data.mime_type === 'string' ? data.mime_type : undefined,
    file_size: typeof data.file_size === 'number' ? data.file_size : undefined,
  };
}

/** FormData multipart pour POST /medical-documents, /patient-documents/upload, care-photos, etc. */
export async function buildMedicalDocumentForm(
  file: UploadFileInput,
  meta: MedicalDocumentMeta,
): Promise<FormData> {
  const prepared = await prepareMedicalUploadFile(file);

  await inspectMedDocFile(prepared.uri, 'upload:formData');

  logMedDoc('upload:form', {
    path: 'pending',
    field: prepared.fieldName ?? 'file',
    name: prepared.fileName,
    type: prepared.mimeType ?? guessMime(prepared.fileName),
    uri: prepared.uri,
  });

  return buildFormDataFromPrepared(prepared, meta);
}

/**
 * Upload + mise en cache locale immédiate (fond vert / aperçu sans re-téléchargement).
 */
export async function uploadMedicalDocument(
  file: UploadFileInput,
  meta: MedicalDocumentMeta,
  path = '/medical-documents',
): Promise<UploadedMedicalDocument | null> {
  const prepared = await prepareMedicalUploadFile(file);
  const fd = buildFormDataFromPrepared(prepared, meta);

  await inspectMedDocFile(prepared.uri, 'upload:formData');
  logMedDoc('upload:form', {
    path,
    field: prepared.fieldName ?? 'file',
    name: prepared.fileName,
    type: prepared.mimeType ?? guessMime(prepared.fileName),
    uri: prepared.uri,
  });

  logMedDoc('upload:POST', { path });
  const res = await api.postForm<Record<string, unknown>>(path, fd);
  logMedDoc('upload:RESPONSE', {
    path,
    success: res.success,
    error: res.error ?? res.message ?? null,
    data: res.data ?? null,
  });
  if (res.success === false) {
    throw new Error(res.error ?? res.message ?? 'Upload échoué');
  }

  const uploaded = parseUploadedMedicalDocument(res.data);
  if (uploaded?.id) {
    await seedMedicalDocumentCache(
      uploaded.id,
      uploaded.file_name ?? prepared.fileName,
      prepared.uri,
    );
  }
  return uploaded;
}

export async function uploadFormData(path: string, formData: FormData): Promise<void> {
  logMedDoc('upload:POST', { path });
  const res = await api.postForm<Record<string, unknown>>(path, formData);
  logMedDoc('upload:RESPONSE', {
    path,
    success: res.success,
    error: res.error ?? res.message ?? null,
    data: res.data ?? null,
  });
  if (res.success === false) {
    throw new Error(res.error ?? res.message ?? 'Upload échoué');
  }
}

export { MAX_UPLOAD_BYTES } from './upload-limits';
