/** Contexte galerie photo de soin (aligné sur CarePhotoGallery::isEligibleContext côté API). */
export function isCarePhotoGalleryContext(apt: { type?: string; created_by_role?: string } | null | undefined): boolean {
  return String(apt?.type || '') === 'nursing' && String(apt?.created_by_role || '') === 'pro';
}
