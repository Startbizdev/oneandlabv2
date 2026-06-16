import type { CarePhotoRow } from '../api/appointment-detail.service';

export function isCarePhotoPdf(photo: CarePhotoRow | null | undefined): boolean {
  if (!photo) return false;
  if (isCarePhotoThreadAnchor(photo)) return false;
  const mime = String(photo.mime_type ?? '').toLowerCase();
  if (mime === 'application/pdf') return true;
  const name = String(photo.file_name ?? '').toLowerCase();
  return name.endsWith('.pdf');
}

export function isCarePhotoThreadAnchor(photo: {
  mime_type?: string | null;
} | null | undefined): boolean {
  return String(photo?.mime_type ?? '') === 'application/vnd.cary.exchange-thread';
}

export function carePhotoAttachmentLabel(photo: CarePhotoRow): string {
  if (isCarePhotoPdf(photo)) return photo.file_name?.trim() || 'Document PDF';
  return photo.file_name?.trim() || 'Photo';
}
