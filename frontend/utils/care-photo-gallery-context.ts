type CarePhotoGalleryApt = {
  type?: string;
  created_by_role?: string;
  status?: string;
  assigned_nurse_id?: string;
  created_by?: string;
};

type CarePhotoGalleryUser = {
  id?: string;
  role?: string;
};

/** Contexte galerie photo de soin (aligné sur CarePhotoGallery::isEligibleContext côté API). */
export function isCarePhotoGalleryContext(apt: CarePhotoGalleryApt | null | undefined): boolean {
  return String(apt?.type || '') === 'nursing' && String(apt?.created_by_role || '') === 'pro';
}

/** Aligné API `CarePhotoGallery::canUpload`. */
export function canUploadCarePhotos(
  apt: CarePhotoGalleryApt | null | undefined,
  user: CarePhotoGalleryUser | null | undefined,
): boolean {
  if (!apt || !user?.id || !isCarePhotoGalleryContext(apt)) return false;
  const status = String(apt.status ?? '');
  if (!['confirmed', 'planned', 'inProgress', 'in_progress', 'completed'].includes(status)) {
    return false;
  }
  const uid = String(user.id);
  if (user.role === 'pro') {
    return String(apt.created_by ?? '') === uid;
  }
  if (user.role === 'nurse') {
    return String(apt.assigned_nurse_id ?? '') === uid;
  }
  return false;
}
