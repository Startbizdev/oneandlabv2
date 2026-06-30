import type { LocationQuery, Router, RouteLocationNormalizedLoaded } from 'vue-router';

export function isCareGalleryDeepLinkQuery(q: unknown): boolean {
  return q === '1' || q === 'true';
}

export function parseCarePhotoIdFromQuery(
  carePhoto: LocationQuery['carePhoto'],
  availableIds: string[],
): string | null {
  const fromQuery =
    typeof carePhoto === 'string'
      ? carePhoto.trim()
      : Array.isArray(carePhoto)
        ? String(carePhoto[0] || '').trim()
        : '';
  if (fromQuery && availableIds.includes(fromQuery)) return fromQuery;
  return availableIds[0] ?? null;
}

export function stripCareGalleryQuery(
  route: RouteLocationNormalizedLoaded,
  router: Router,
): void {
  const rest = { ...route.query } as Record<string, unknown>;
  delete rest.careGallery;
  delete rest.carePhoto;
  void router.replace({
    path: route.path,
    query: rest as Record<string, string | string[] | undefined>,
  });
}
