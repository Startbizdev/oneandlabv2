import type { Href } from 'expo-router';

export type CarePhotoExchangeRole = 'nurse' | 'pro';

/** Seuls l'infirmier et le pro disposent de la vue échanges photo (stack, pas modal). */
export function isCarePhotoExchangeRole(role: string): role is CarePhotoExchangeRole {
  return role === 'nurse' || role === 'pro';
}

/** Vue échanges du RDV, ou fil d'une photo de soin quand `photoId` est fourni. */
export function carePhotoDiscussionHref(
  role: CarePhotoExchangeRole,
  appointmentId: string,
  photoId?: string,
): Href {
  if (photoId) {
    const params = { id: appointmentId, photoId };
    return role === 'pro'
      ? { pathname: '/(pro)/appointment/[id]/care-photo/[photoId]', params }
      : { pathname: '/(nurse)/appointment/[id]/care-photo/[photoId]', params };
  }
  const params = { id: appointmentId };
  return role === 'pro'
    ? { pathname: '/(pro)/appointment/[id]/exchange', params }
    : { pathname: '/(nurse)/appointment/[id]/exchange', params };
}
