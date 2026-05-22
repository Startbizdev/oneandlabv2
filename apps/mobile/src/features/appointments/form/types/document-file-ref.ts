import type { LocalFileRef } from '../types';

/** Document déjà enregistré sur le profil patient / proche (reprise RDV). */
export type ProfileDocRef = {
  medical_document_id: string;
  isNew: false;
  field?: string;
  file_name?: string;
};

export type DocumentFileRef = LocalFileRef | ProfileDocRef;

export function isProfileDocRef(v: unknown): v is ProfileDocRef {
  return (
    typeof v === 'object' &&
    v !== null &&
    'medical_document_id' in v &&
    typeof (v as ProfileDocRef).medical_document_id === 'string' &&
    (v as ProfileDocRef).isNew === false
  );
}

export function isLocalFileRef(v: unknown): v is LocalFileRef {
  return typeof v === 'object' && v !== null && 'uri' in v && typeof (v as LocalFileRef).uri === 'string';
}

export function hasDocumentFile(
  files: Record<string, DocumentFileRef | undefined> | undefined,
  key: string,
  profileDocs?: Record<string, { medical_document_id?: string } | undefined>,
): boolean {
  const entry = files?.[key];
  if (entry && (isLocalFileRef(entry) || isProfileDocRef(entry))) return true;
  return Boolean(profileDocs?.[key]?.medical_document_id);
}

export function profileDocRefFromRow(
  docType: string,
  row: { medical_document_id?: string; id?: string; file_name?: string },
): ProfileDocRef | undefined {
  const mid = row.medical_document_id ?? row.id;
  if (!mid) return undefined;
  return {
    medical_document_id: String(mid),
    isNew: false,
    field: docType,
    file_name: row.file_name,
  };
}
