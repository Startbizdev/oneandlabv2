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
export function resolveNotificationNavigation(
  notif: AppNotification,
  role: string | undefined,
): NotificationNavTarget {
  const intent = resolveNotificationNavIntent(notif, role);
  const prefix = role ? rolePrefix(role) : null;

  if (intent.kind === 'none' || !prefix) {
    return { kind: 'none' };
  }

  switch (intent.kind) {
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
          params: intent.messageId ? { messageId: intent.messageId } : undefined,
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
