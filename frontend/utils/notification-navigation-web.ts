import type { RouteLocationRaw } from 'vue-router';
import {
  parseNotificationData,
  resolveNotificationNavIntent,
  type NotificationNavInput,
  type PharmacyOrderNotificationSide,
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

/** Liste des commandes pharmacie du rôle ; le pro distingue commandes envoyées et reçues. */
export function pharmacyOrderWebBase(role: string | undefined, side?: PharmacyOrderNotificationSide): string | null {
  switch (role) {
    case 'patient':
      return '/patient/traitements';
    case 'nurse':
      return '/nurse/commandes-pharmacie';
    case 'super_admin':
      return '/admin/commandes-pharmacie';
    case 'pro':
      return side === 'received' ? '/pro/commandes-recues' : '/pro/commandes-pharmacie';
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
      const orderBase = pharmacyOrderWebBase(role, intent.side);
      if (!orderBase) return null;
      const detail = `${orderBase}/${intent.orderId}`;
      return intent.messageId
        ? { path: `${detail}/messages`, query: { message: intent.messageId } }
        : detail;
    }
    case 'passage_series': {
      if (role !== 'nurse') return null;
      return `/nurse/passage/${intent.seriesId}`;
    }
    case 'nurse_tour': {
      if (role !== 'nurse') return null;
      return intent.date ? { path: '/nurse/tournee', query: { date: intent.date } } : '/nurse/tournee';
    }
    case 'patient_transmissions':
      return { path: '/profile', query: { userId: intent.patientId }, hash: '#patient-transmissions' };
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
