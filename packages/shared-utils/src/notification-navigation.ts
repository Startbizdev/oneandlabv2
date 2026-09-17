/**
 * Routage notifications — intent partagé web / mobile (sans chemins plateforme).
 */

export type NotificationNavIntent =
  | { kind: 'none' }
  | { kind: 'results' }
  | { kind: 'reviews'; reviewId?: string; appointmentId?: string }
  | { kind: 'appointments_list' }
  | {
      kind: 'appointment';
      appointmentId: string;
      conversation?: boolean;
      messageId?: string;
      review?: boolean;
      careGallery?: boolean;
      carePhotoId?: string;
      /** Infirmier / labo / sous-compte : ouvrir la modale offre si éligible. */
      pendingModal?: boolean;
    };

export type NotificationNavInput = {
  type?: string | null;
  appointment_id?: string | null;
  data?: unknown;
};

export function parseNotificationData(raw: unknown): Record<string, unknown> {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }
  return typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
}

export function getNotificationAppointmentId(
  notif: NotificationNavInput,
  data: Record<string, unknown>,
): string | null {
  const id = notif.appointment_id ?? data.appointment_id ?? data.appointmentId;
  return id != null && String(id).trim() !== '' ? String(id) : null;
}

function messageId(data: Record<string, unknown>): string | null {
  const id = data.message_id ?? data.messageId;
  return id != null && String(id).trim() !== '' ? String(id) : null;
}

/** true si la notification peut mener à une page ou une action (hors « marquer lu »). */
export function notificationIsNavigable(
  notif: NotificationNavInput,
  role: string | undefined,
): boolean {
  return resolveNotificationNavIntent(notif, role).kind !== 'none';
}

export function resolveNotificationNavIntent(
  notif: NotificationNavInput,
  role: string | undefined,
): NotificationNavIntent {
  const type = String(notif.type ?? '').trim();
  const data = parseNotificationData(notif.data);
  const aptId = getNotificationAppointmentId(notif, data);
  const conversationMessageId = messageId(data);

  if (
    type === 'share_link_appointment_taken' ||
    data.no_navigate === true ||
    data.no_navigate === 'true'
  ) {
    return { kind: 'none' };
  }

  const isNewReview =
    type === 'new_review' ||
    type === 'new_review_on_pro_patient' ||
    Boolean(data.review_id);

  if (type === 'results_available' && (role === 'nurse' || role === 'pro')) {
    return { kind: 'results' };
  }

  if (
    aptId &&
    (type === 'care_gallery_photo' || type === 'care_gallery_comment') &&
    (role === 'pro' || role === 'nurse')
  ) {
    const photoId = data.photo_id != null ? String(data.photo_id).trim() : '';
    return {
      kind: 'appointment',
      appointmentId: aptId,
      careGallery: true,
      ...(photoId ? { carePhotoId: photoId } : {}),
    };
  }

  if (type === 'care_gallery_photo' || type === 'care_gallery_comment') {
    return { kind: 'none' };
  }

  if (isNewReview && role === 'pro' && aptId) {
    return { kind: 'appointment', appointmentId: aptId, review: true };
  }

  if (isNewReview && (role === 'nurse' || role === 'lab' || role === 'subaccount')) {
    const reviewId = data.review_id != null ? String(data.review_id) : undefined;
    return {
      kind: 'reviews',
      reviewId,
      appointmentId: aptId ?? undefined,
    };
  }

  if (aptId && type === 'conversation_message') {
    if (
      role === 'pro' ||
      role === 'nurse' ||
      role === 'lab' ||
      role === 'subaccount' ||
      role === 'preleveur' ||
      role === 'patient'
    ) {
      return {
        kind: 'appointment',
        appointmentId: aptId,
        conversation: true,
        ...(conversationMessageId ? { messageId: conversationMessageId } : {}),
      };
    }
    return { kind: 'none' };
  }

  if (aptId && type === 'appointment_request_sent') {
    if (role === 'pro' || role === 'nurse' || role === 'subaccount' || role === 'lab') {
      return { kind: 'appointment', appointmentId: aptId };
    }
    return { kind: 'none' };
  }

  if (role === 'patient') {
    if (type === 'results_ready' || type === 'results_available') {
      return { kind: 'results' };
    }
    if (aptId && (type === 'care_gallery_photo' || type === 'care_gallery_comment')) {
      const photoId = data.photo_id != null ? String(data.photo_id).trim() : '';
      return {
        kind: 'appointment',
        appointmentId: aptId,
        careGallery: true,
        ...(photoId ? { carePhotoId: photoId } : {}),
      };
    }
    if (aptId) {
      return { kind: 'appointment', appointmentId: aptId };
    }
    return { kind: 'none' };
  }

  if (
    aptId &&
    type === 'appointment_redispatched' &&
    role &&
    ['nurse', 'lab', 'subaccount'].includes(role)
  ) {
    return { kind: 'appointments_list' };
  }

  if (aptId && role === 'pro') {
    return { kind: 'appointment', appointmentId: aptId };
  }

  if (aptId && ['nurse', 'lab', 'subaccount'].includes(role ?? '')) {
    return { kind: 'appointment', appointmentId: aptId, pendingModal: true };
  }

  if (aptId && role === 'preleveur') {
    return { kind: 'appointment', appointmentId: aptId };
  }

  if (aptId && role === 'super_admin') {
    return { kind: 'appointment', appointmentId: aptId };
  }

  if (aptId) {
    return { kind: 'appointment', appointmentId: aptId };
  }

  return { kind: 'none' };
}
