import type { RouteLocationRaw } from 'vue-router';
import {
  parseNotificationData,
  resolveNotificationNavIntent,
  type NotificationNavInput,
} from '@oneandlab/shared-utils';

export { notificationIsNavigable, parseNotificationData, resolveNotificationNavIntent } from '@oneandlab/shared-utils';

function roleBasePath(role: string | undefined): string | null {
  switch (role) {
    case 'pro':
      return '/pro';
    case 'nurse':
      return '/nurse';
    case 'lab':
    case 'subaccount':
      return role === 'subaccount' ? '/subaccount' : '/lab';
    case 'preleveur':
      return '/preleveur';
    case 'patient':
      return '/patient';
    case 'super_admin':
      return '/admin';
    default:
      return null;
  }
}

export function webNotificationRoute(
  notif: NotificationNavInput,
  role: string | undefined,
): RouteLocationRaw | null {
  const intent = resolveNotificationNavIntent(notif, role);
  const base = roleBasePath(role);

  switch (intent.kind) {
    case 'none':
      return null;
    case 'results':
      if (role === 'patient') return '/patient/resultats';
      if (role === 'pro') return '/pro/resultats';
      if (role === 'nurse') return '/nurse/resultats';
      return null;
    case 'reviews': {
      const reviewsBase =
        role === 'nurse'
          ? '/nurse/reviews'
          : role === 'lab'
            ? '/lab/reviews'
            : role === 'subaccount'
              ? '/subaccount/reviews'
              : null;
      if (!reviewsBase) return null;
      const query: Record<string, string> = {};
      if (intent.reviewId) query.review = intent.reviewId;
      else if (intent.appointmentId) query.appointment = intent.appointmentId;
      return Object.keys(query).length ? { path: reviewsBase, query } : reviewsBase;
    }
    case 'appointments_list': {
      if (!base) return null;
      return `${base}/appointments`;
    }
    case 'appointment': {
      if (!base && role !== 'super_admin') return null;
      const prefix = role === 'super_admin' ? '/admin' : base!;
      const path = `${prefix}/appointments/${intent.appointmentId}`;
      const query: Record<string, string> = {};
      if (intent.conversation) query.conversation = '1';
      if (intent.messageId) query.message = intent.messageId;
      if (intent.review) query.review = '1';
      if (intent.careGallery) query.careGallery = '1';
      if (intent.carePhotoId) query.carePhoto = intent.carePhotoId;
      return Object.keys(query).length ? { path, query } : path;
    }
    case 'pharmacy_order': {
      if (role === 'patient') return `/patient/traitements/${intent.orderId}`;
      if (role === 'nurse') return `/nurse/commandes-pharmacie/${intent.orderId}`;
      if (role === 'super_admin') return `/admin/commandes-pharmacie/${intent.orderId}`;
      if (role === 'pro') {
        const type = String(notif.type ?? '');
        const received = type === 'pharmacy_order_created';
        return received
          ? `/pro/commandes-recues/${intent.orderId}`
          : `/pro/commandes-pharmacie/${intent.orderId}`;
      }
      return null;
    }
    default:
      return null;
  }
}

export function webNotificationNeedsPendingModal(
  notif: NotificationNavInput,
  role: string | undefined,
): boolean {
  const intent = resolveNotificationNavIntent(notif, role);
  return intent.kind === 'appointment' && Boolean(intent.pendingModal);
}

export function webNotificationAppointmentId(
  notif: NotificationNavInput,
  role: string | undefined,
): string | null {
  const intent = resolveNotificationNavIntent(notif, role);
  return intent.kind === 'appointment' ? intent.appointmentId : null;
}
