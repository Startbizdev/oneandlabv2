import type { AppointmentDetailRole } from './appointment-detail-role-config';

/** Route expo-router vers la vue échanges photo (stack, pas modal). */
export function carePhotoDiscussionHref(
  role: AppointmentDetailRole | string,
  appointmentId: string,
  photoId: string,
): string {
  const prefix = role === 'pro' ? '/(pro)' : '/(nurse)';
  return `${prefix}/appointment/${encodeURIComponent(appointmentId)}/care-photo/${encodeURIComponent(photoId)}`;
}
