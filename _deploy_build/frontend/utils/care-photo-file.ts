/** Types MIME autorisés pour l’échange pro ↔ infirmier (aligné UploadMimeTypes::CARE_PHOTO). */
export const CARE_PHOTO_ALLOWED_MIME = [
  'image/jpeg',
  'image/png',
  'image/jpg',
  'image/heic',
  'image/heif',
  'image/webp',
  'application/pdf',
] as const;

export const CARE_PHOTO_ACCEPT_ATTR =
  'image/jpeg,image/png,image/jpg,image/heic,image/heif,image/webp,application/pdf';

export function isCarePhotoThreadAnchor(doc: {
  mime_type?: string | null;
} | null | undefined): boolean {
  return String(doc?.mime_type ?? '') === 'application/vnd.cary.exchange-thread';
}

export function isCarePhotoPdf(doc: {
  mime_type?: string | null;
  file_name?: string | null;
} | null | undefined): boolean {
  if (!doc) return false;
  if (isCarePhotoThreadAnchor(doc)) return false;
  const mime = String(doc.mime_type ?? '').toLowerCase();
  if (mime === 'application/pdf') return true;
  const name = String(doc.file_name ?? '').toLowerCase();
  return name.endsWith('.pdf');
}

export function carePhotoFileLabel(doc: {
  mime_type?: string | null;
  file_name?: string | null;
} | null | undefined): string {
  if (!doc) return 'Fichier';
  if (isCarePhotoPdf(doc)) return 'Document PDF';
  return 'Photo';
}
