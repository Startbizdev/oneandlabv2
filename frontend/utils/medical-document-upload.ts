import { MAX_UPLOAD_BYTES } from '../constants/upload-limits';

/** Aligné sur backend `UploadMimeTypes::MEDICAL_DOCUMENT`. */
export const MEDICAL_DOCUMENT_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/heic',
  'image/heif',
  'image/webp',
  'application/pdf',
] as const;

export const MEDICAL_DOCUMENT_ACCEPT =
  'image/jpeg,image/png,image/jpg,image/heic,image/heif,image/webp,application/pdf';

const EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'pdf', 'heic', 'heif', 'webp']);

function fileExtension(name: string): string {
  const parts = name.split('.');
  return parts.length > 1 ? (parts.pop()?.toLowerCase() ?? '') : '';
}

/** iOS / Windows peuvent renvoyer un type MIME vide pour HEIC. */
export function isAllowedMedicalDocumentFile(file: File, docType?: string): boolean {
  if (docType === 'resultats') {
    const type = file.type.toLowerCase();
    return type === 'application/pdf' || fileExtension(file.name) === 'pdf';
  }

  const type = file.type.toLowerCase();
  if (type && (MEDICAL_DOCUMENT_MIME_TYPES as readonly string[]).includes(type)) {
    return true;
  }

  return EXTENSIONS.has(fileExtension(file.name));
}

export function medicalDocumentFormatError(docType?: string): string {
  if (docType === 'resultats') {
    return 'Les résultats doivent être en PDF.';
  }
  return 'Formats acceptés : JPG, PNG, PDF, HEIC, WebP.';
}

export function isMedicalDocumentTooLarge(file: File): boolean {
  return file.size > MAX_UPLOAD_BYTES;
}
