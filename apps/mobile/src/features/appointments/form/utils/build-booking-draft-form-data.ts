import { isLocalFileRef, isProfileDocRef } from '../types/document-file-ref';
import type { DocumentFileRef } from '../types/document-file-ref';

type PayloadWithFiles = Record<string, unknown> & {
  files?: Record<string, DocumentFileRef | undefined>;
  form_data?: Record<string, unknown>;
};

function fileMetaForJson(entry: DocumentFileRef): Record<string, unknown> | null {
  if (isProfileDocRef(entry)) {
    return {
      medical_document_id: entry.medical_document_id,
      isNew: false,
      field: entry.field,
      file_name: entry.file_name,
    };
  }
  if (isLocalFileRef(entry)) {
    return { isNew: true, file_name: entry.name };
  }
  return null;
}

/** FormData aligné web POST /patient/booking-draft (payloads JSON + u_{i}_{field}). */
export async function buildPatientBookingDraftFormData(
  payloads: PayloadWithFiles[],
): Promise<FormData> {
  const jsonPayloads = payloads.map((p) => {
    const { files, ...rest } = p;
    const formData = { ...(rest.form_data as Record<string, unknown> | undefined) };
    if (files && typeof files === 'object') {
      const filesMeta: Record<string, unknown> = {
        ...((formData.files as Record<string, unknown> | undefined) ?? {}),
      };
      for (const [key, entry] of Object.entries(files)) {
        if (!entry) continue;
        const meta = fileMetaForJson(entry);
        if (meta) filesMeta[key] = meta;
      }
      if (Object.keys(filesMeta).length) {
        formData.files = filesMeta;
      }
    }
    return { ...rest, form_data: formData };
  });

  const fd = new FormData();
  fd.append('payloads', JSON.stringify(jsonPayloads));

  for (let pi = 0; pi < payloads.length; pi++) {
    const pf = payloads[pi]?.files;
    if (!pf || typeof pf !== 'object') continue;
    for (const [key, entry] of Object.entries(pf)) {
      if (!entry || !isLocalFileRef(entry)) continue;
      fd.append(`u_${pi}_${key}`, {
        uri: entry.uri,
        name: entry.name,
        type: entry.mimeType ?? 'application/octet-stream',
      } as unknown as Blob);
    }
  }

  return fd;
}
