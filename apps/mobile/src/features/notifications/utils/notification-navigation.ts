import type { AppNotification } from '../api/notifications.service';
import {
  notificationIsNavigable,
  parseNotificationData,
  resolveNotificationNavIntent,
} from '@oneandlab/shared-utils';

export type NotificationNavTarget =
  | { kind: 'none' }
  | { kind: 'route'; pathname: string; params?: Record<string, string> };

export { notificationIsNavigable, parseNotificationData, resolveNotificationNavIntent };

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
 * Routage cloche mobile — intent partagé + chemins Expo Router.
 */
export type NotificationNavigationOptions = {
  /** Pro pharmacien — priorise la boîte de réception pour les messages. */
  pharmacyCanReceive?: boolean;
};

const PHARMACY_REQUESTER_NOTIF_TYPES = new Set([
  'pharmacy_order_accepted',
  'pharmacy_order_refused',
  'pharmacy_order_complement_requested',
  'pharmacy_order_completed',
]);

function pharmacyOrderPathname(
  prefix: string,
  orderId: string,
  notifType: string,
  role: string,
  options?: NotificationNavigationOptions,
): string {
  if (role === 'patient') {
    return `${prefix}/traitements/${orderId}`;
  }
  if (role === 'nurse') {
    return `${prefix}/commandes-pharmacie/${orderId}`;
  }
  if (notifType === 'pharmacy_order_created') {
    return `${prefix}/commandes-recues/${orderId}`;
  }
  if (PHARMACY_REQUESTER_NOTIF_TYPES.has(notifType)) {
    return `${prefix}/commandes-pharmacie/${orderId}`;
  }
  if (notifType === 'pharmacy_order_message' && options?.pharmacyCanReceive) {
    return `${prefix}/commandes-recues/${orderId}`;
  }
  if (notifType === 'pharmacy_order_message') {
    return `${prefix}/commandes-pharmacie/${orderId}`;
  }
  if (options?.pharmacyCanReceive) {
    return `${prefix}/commandes-recues/${orderId}`;
  }
  return `${prefix}/commandes-pharmacie/${orderId}`;
}

export function resolveNotificationNavigation(
  notif: AppNotification,
  role: string | undefined,
  options?: NotificationNavigationOptions,
): NotificationNavTarget {
  const intent = resolveNotificationNavIntent(notif, role);
  const prefix = role ? rolePrefix(role) : null;

  if (intent.kind === 'none' || !prefix) {
    return { kind: 'none' };
  }

  switch (intent.kind) {
    case 'pharmacy_order': {
      const params = intent.messageId ? { messageId: intent.messageId } : undefined;
      return {
        kind: 'route',
        pathname: pharmacyOrderPathname(
          prefix,
          intent.orderId,
          String(notif.type ?? ''),
          role ?? '',
          options,
        ),
        params,
      };
    }
    case 'results':
      return { kind: 'route', pathname: `${prefix}/resultats` };
    case 'reviews': {
      const params: Record<string, string> = {};
      if (intent.reviewId) params.review = intent.reviewId;
      else if (intent.appointmentId) params.appointment = intent.appointmentId;
      return {
        kind: 'route',
        pathname: `${prefix}/reviews`,
        params: Object.keys(params).length ? params : undefined,
      };
    }
    case 'appointments_list':
      return { kind: 'route', pathname: `${prefix}/(tabs)/appointments` };
    case 'appointment': {
      if (intent.conversation) {
        return {
          kind: 'route',
          pathname: `${prefix}/appointment/${intent.appointmentId}/conversation`,
          params: {
            fromNotification: '1',
            ...(intent.messageId ? { messageId: intent.messageId } : {}),
          },
        };
      }
      if (intent.careGallery && intent.carePhotoId) {
        return {
          kind: 'route',
          pathname: `${prefix}/appointment/${intent.appointmentId}/care-photo/${intent.carePhotoId}`,
        };
      }
      const params: Record<string, string> = {};
      if (intent.review) params.review = '1';
      if (intent.careGallery) params.careGallery = '1';
      return {
        kind: 'route',
        pathname: `${prefix}/appointment/${intent.appointmentId}`,
        params: Object.keys(params).length ? params : undefined,
      };
    }
    default:
      return { kind: 'none' };
  }
}
