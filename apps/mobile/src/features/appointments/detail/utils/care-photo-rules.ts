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

/** Aligné API `CarePhotoGallery::canUpload` (repli si `can_upload` absent). */
export function canNurseUploadCarePhotos(
  apt: Appointment,
  userId: string | undefined,
): boolean {
  if (!userId || !isCarePhotoGalleryContext(apt)) return false;
  const ext = apt as AptExt;
  if (String(ext.assigned_nurse_id ?? '') !== String(userId)) return false;
  const status = String(apt.status ?? '');
  return ['confirmed', 'planned', 'inProgress', 'in_progress', 'completed'].includes(
    status,
  );
}

export function canNurseCommentCarePhotos(
  apt: Appointment,
  userId: string | undefined,
): boolean {
  if (!userId || !isCarePhotoGalleryContext(apt)) return false;
  const ext = apt as AptExt;
  return String(ext.assigned_nurse_id ?? '') === String(userId);
}
