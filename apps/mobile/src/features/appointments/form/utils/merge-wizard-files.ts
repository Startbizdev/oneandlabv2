import type { DocumentFileRef } from '../types/document-file-ref';

/** Fusionne les documents personnels dans le 1er acte (comme le web). */
export function mergePersonalFilesIntoFormData(
  formDataByService: Record<string, Record<string, unknown>>,
  personalFiles: Record<string, DocumentFileRef | undefined>,
  firstServiceId: string | undefined,
): Record<string, Record<string, unknown>> {
  if (!firstServiceId || !Object.keys(personalFiles).some((k) => personalFiles[k])) {
    return formDataByService;
  }
  const next = { ...formDataByService };
  const slice = { ...(next[firstServiceId] ?? {}) };
  const existing = (slice.files ?? {}) as Record<string, DocumentFileRef | undefined>;
  slice.files = { ...existing, ...personalFiles };
  next[firstServiceId] = slice;
  return next;
}
