import type { Appointment } from '@oneandlab/shared-types';
import { isNursingAppointment } from '@oneandlab/shared-utils';

type AptExt = Appointment & {
  created_by_role?: string;
  assigned_nurse_id?: string;
};

/** Aligné web `care-photo-gallery-context` + API `CarePhotoGallery::isEligibleContext`. */
export function isCarePhotoGalleryContext(apt: Appointment): boolean {
  const ext = apt as AptExt;
  return (
    isNursingAppointment(String(ext.type ?? '')) &&
    String(ext.created_by_role ?? '') === 'pro'
  );
}

const UPLOADABLE_STATUSES = [
  'confirmed',
  'planned',
  'inProgress',
  'in_progress',
  'completed',
] as const;

/** Aligné API `CarePhotoGallery::canUpload` (repli si `can_upload` absent). */
export function canUploadCarePhotos(
  apt: Appointment,
  userId: string | undefined,
  viewerRole?: string,
): boolean {
  if (!userId || !isCarePhotoGalleryContext(apt)) return false;
  const ext = apt as AptExt;
  const status = String(apt.status ?? '');
  if (!UPLOADABLE_STATUSES.includes(status as (typeof UPLOADABLE_STATUSES)[number])) {
    return false;
  }
  if (viewerRole === 'pro') {
    return String(ext.created_by ?? '') === String(userId);
  }
  return String(ext.assigned_nurse_id ?? '') === String(userId);
}

/** @deprecated Préférer `canUploadCarePhotos`. */
export function canNurseUploadCarePhotos(
  apt: Appointment,
  userId: string | undefined,
): boolean {
  return canUploadCarePhotos(apt, userId, 'nurse');
}

export function canNurseCommentCarePhotos(
  apt: Appointment,
  userId: string | undefined,
): boolean {
  if (!userId || !isCarePhotoGalleryContext(apt)) return false;
  const ext = apt as AptExt;
  return String(ext.assigned_nurse_id ?? '') === String(userId);
}
