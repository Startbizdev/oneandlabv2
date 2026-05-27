/** Paramètres deep link galerie photos (aligné web `careGallery` / `carePhoto`). */
export type CarePhotoDeepLinkRequest = {
  openDiscussion: boolean;
  photoId?: string;
};

function isTruthyParam(v: string | string[] | undefined): boolean {
  const raw = Array.isArray(v) ? v[0] : v;
  return raw === '1' || raw === 'true';
}

function paramString(v: string | string[] | undefined): string {
  const raw = Array.isArray(v) ? v[0] : v;
  return raw != null ? String(raw).trim() : '';
}

export function parseCarePhotoDeepLinkParams(params: {
  careGallery?: string | string[];
  carePhoto?: string | string[];
}): CarePhotoDeepLinkRequest | null {
  if (!isTruthyParam(params.careGallery)) return null;
  const photoId = paramString(params.carePhoto);
  return {
    openDiscussion: true,
    ...(photoId ? { photoId } : {}),
  };
}

export function resolveCarePhotoDiscussionId(
  photos: ReadonlyArray<{ id: string }>,
  request: CarePhotoDeepLinkRequest,
): string | null {
  if (photos.length === 0) return null;
  if (request.photoId && photos.some((p) => p.id === request.photoId)) {
    return request.photoId;
  }
  return photos[0]?.id ?? null;
}
