import type { AppointmentDetailRole } from './appointment-detail-role-config';

/** Route expo-router vers la vue échanges (stack, pas modal). */
export function carePhotoDiscussionHref(
  role: AppointmentDetailRole | string,
  appointmentId: string,
  photoId?: string,
): string {
  const prefix = role === 'pro' ? '/(pro)' : '/(nurse)';
  if (!photoId) {
    return `${prefix}/appointment/${encodeURIComponent(appointmentId)}/exchange`;
  }
  return `${prefix}/appointment/${encodeURIComponent(appointmentId)}/care-photo/${encodeURIComponent(photoId)}`;
}
