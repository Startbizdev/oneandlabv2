import type { AppNotification } from '../api/notifications.service';

export type NotificationNavTarget =
  | { kind: 'none' }
  | { kind: 'route'; pathname: string; params?: Record<string, string> };

function parseNotificationData(
  raw: AppNotification['data'],
): Record<string, unknown> {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }
  return typeof raw === 'object' ? raw : {};
}

function appointmentId(
  notif: AppNotification,
  data: Record<string, unknown>,
): string | null {
  const id = notif.appointment_id ?? data.appointment_id;
  return id != null && String(id).trim() !== '' ? String(id) : null;
}

function rolePrefix(role: string): string | null {
  switch (role) {
    case 'nurse':
      return '/(nurse)';
    case 'preleveur':
      return '/(preleveur)';
    case 'pro':
      return '/(pro)';
    case 'patient':
      return '/(patient)';
    case 'lab':
    case 'subaccount':
      return '/(lab)';
    default:
      return null;
  }
}

/**
 * Routage cloche — aligné `dashboard.vue` / `patient.vue` (types les plus fréquents).
 */
export function resolveNotificationNavigation(
  notif: AppNotification,
  role: string | undefined,
): NotificationNavTarget {
  const type = String(notif.type ?? '').trim();
  const data = parseNotificationData(notif.data);
  const aptId = appointmentId(notif, data);
  const prefix = role ? rolePrefix(role) : null;

  if (
    type === 'share_link_appointment_taken' ||
    data.no_navigate === true
  ) {
    return { kind: 'none' };
  }

  if (!prefix) return { kind: 'none' };

  const isNewReview =
    type === 'new_review' ||
    type === 'new_review_on_pro_patient' ||
    Boolean(data.review_id);

  if (aptId && type === 'results_available' && role === 'nurse') {
    return {
      kind: 'route',
      pathname: `${prefix}/appointment/${aptId}`,
      params: {
        focus: 'resultats',
        ...(data.medical_document_id
          ? { doc: String(data.medical_document_id) }
          : {}),
      },
    };
  }

  if (
    aptId &&
    (type === 'care_gallery_photo' || type === 'care_gallery_comment') &&
    (role === 'pro' || role === 'nurse')
  ) {
    const photoId = data.photo_id != null ? String(data.photo_id).trim() : '';
    return {
      kind: 'route',
      pathname: `${prefix}/appointment/${aptId}`,
      params: {
        careGallery: '1',
        ...(photoId ? { carePhoto: photoId } : {}),
      },
    };
  }

  if (isNewReview && role === 'pro' && aptId) {
    return {
      kind: 'route',
      pathname: `${prefix}/appointment/${aptId}`,
      params: { review: '1' },
    };
  }

  if (isNewReview && role === 'nurse') {
    const reviewId = data.review_id != null ? String(data.review_id) : '';
    return {
      kind: 'route',
      pathname: `${prefix}/reviews`,
      params: reviewId ? { review: reviewId } : aptId ? { appointment: aptId } : undefined,
    };
  }

  if (isNewReview && (role === 'lab' || role === 'subaccount')) {
    return { kind: 'route', pathname: `${prefix}/reviews` };
  }

  if (aptId && type === 'appointment_request_sent') {
    return { kind: 'route', pathname: `${prefix}/appointment/${aptId}` };
  }

  if (aptId && role === 'patient') {
    if (type === 'results_ready' || type === 'results_available') {
      return {
        kind: 'route',
        pathname: `${prefix}/appointment/${aptId}`,
        params: { focus: 'resultats' },
      };
    }
    if (type === 'care_gallery_photo' || type === 'care_gallery_comment') {
      const photoId = data.photo_id != null ? String(data.photo_id).trim() : '';
      return {
        kind: 'route',
        pathname: `${prefix}/appointment/${aptId}`,
        params: {
          careGallery: '1',
          ...(photoId ? { carePhoto: photoId } : {}),
        },
      };
    }
    return { kind: 'route', pathname: `${prefix}/appointment/${aptId}` };
  }

  if (
    aptId &&
    type === 'appointment_redispatched' &&
    role &&
    ['nurse', 'lab', 'subaccount'].includes(role)
  ) {
    return { kind: 'route', pathname: `${prefix}/(tabs)/appointments` };
  }

  if (aptId) {
    return { kind: 'route', pathname: `${prefix}/appointment/${aptId}` };
  }

  return { kind: 'none' };
}
