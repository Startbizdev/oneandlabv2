import type { Href } from 'expo-router';
import type { AppNotification } from '../api/notifications.service';
import { resolveNotificationNavIntent, type PharmacyOrderNotificationSide } from '@oneandlab/shared-utils';
import {
  appointmentDetailHref,
  appointmentsListHref,
  pharmacyOrderDetailHref,
  staffPatientHref,
} from '@/navigation/role-hrefs';
import { roleRoutePrefix } from '@/navigation/role-route-prefix';
import {
  pharmacyOrderMessagesHref,
  type PharmacyOrderRoutePrefix,
} from '@/features/pharmacy-orders/utils/prescriptions-route';

/** Rôles disposant d'une pile Expo Router ; les autres (labo, sous-compte, admin) n'ont aucune cible. */
type NavRole = 'nurse' | 'pro' | 'preleveur' | 'patient';

function navRole(role: string | undefined): NavRole | null {
  switch (role) {
    case 'nurse':
    case 'pro':
    case 'preleveur':
    case 'patient':
      return role;
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
  /** Une pharmacie n'ouvre pas les transmissions infirmières. */
  isPharmacyAccount?: boolean;
};

type RouteParams = Record<string, string>;

function pharmacyRoutePrefix(role: NavRole): PharmacyOrderRoutePrefix | null {
  switch (role) {
    case 'patient':
      return '/(patient)';
    case 'nurse':
      return '/(nurse)';
    case 'pro':
      return '/(pro)';
    default:
      return null;
  }
}

/** Un message ouvre directement la vue Messages de la commande, le reste ouvre sa fiche. */
function pharmacyOrderHref(
  role: NavRole,
  orderId: string,
  side: PharmacyOrderNotificationSide | undefined,
  messageId: string | undefined,
  options?: NotificationNavigationOptions,
): Href | null {
  const prefix = pharmacyRoutePrefix(role);
  if (!prefix) return null;
  const received = prefix === '/(pro)' && (side ? side === 'received' : Boolean(options?.pharmacyCanReceive));
  if (messageId) return pharmacyOrderMessagesHref(prefix, received ? 'received' : 'sent', orderId, messageId);
  if (received) return { pathname: '/(pro)/commandes-recues/[id]', params: { id: orderId } };
  return pharmacyOrderDetailHref(prefix, orderId);
}

function nurseTourHref(date: string | undefined): Href {
  return { pathname: '/(nurse)/(tabs)/tournee', params: date ? { date } : {} };
}

function resultsHref(role: NavRole): Href | null {
  switch (role) {
    case 'nurse':
      return '/(nurse)/resultats';
    case 'pro':
      return '/(pro)/resultats';
    case 'patient':
      return '/(patient)/resultats';
    default:
      return null;
  }
}

function reviewsHref(role: NavRole, params: RouteParams): Href | null {
  switch (role) {
    case 'nurse':
      return { pathname: '/(nurse)/reviews', params };
    case 'patient':
      return { pathname: '/(patient)/reviews', params };
    default:
      return null;
  }
}

function conversationHref(role: NavRole, appointmentId: string, extra: RouteParams): Href {
  const params = { ...extra, id: appointmentId };
  switch (role) {
    case 'nurse':
      return { pathname: '/(nurse)/appointment/[id]/conversation', params };
    case 'pro':
      return { pathname: '/(pro)/appointment/[id]/conversation', params };
    case 'patient':
      return { pathname: '/(patient)/appointment/[id]/conversation', params };
    case 'preleveur':
      return { pathname: '/(preleveur)/appointment/[id]/conversation', params };
  }
}

function carePhotoHref(role: NavRole, appointmentId: string, photoId: string): Href | null {
  const params = { id: appointmentId, photoId };
  switch (role) {
    case 'nurse':
      return { pathname: '/(nurse)/appointment/[id]/care-photo/[photoId]', params };
    case 'pro':
      return { pathname: '/(pro)/appointment/[id]/care-photo/[photoId]', params };
    default:
      return null;
  }
}

function transmissionsHref(role: NavRole, patientId: string): Href | null {
  switch (role) {
    case 'nurse':
      return staffPatientHref('/(nurse)', patientId, 'transmissions');
    case 'pro':
      return staffPatientHref('/(pro)', patientId, 'transmissions');
    default:
      return null;
  }
}

/** Cible de navigation d'une notification, ou `null` si elle n'ouvre aucun écran pour ce rôle. */
export function resolveNotificationNavigation(
  notif: AppNotification,
  role: string | undefined,
  options?: NotificationNavigationOptions,
): Href | null {
  const intent = resolveNotificationNavIntent(notif, role);
  const r = navRole(role);
  if (!r) return null;

  switch (intent.kind) {
    case 'pharmacy_order':
      return pharmacyOrderHref(r, intent.orderId, intent.side, intent.messageId, options);
    case 'results':
      return resultsHref(r);
    case 'reviews': {
      const params: RouteParams = {};
      if (intent.reviewId) params.review = intent.reviewId;
      else if (intent.appointmentId) params.appointment = intent.appointmentId;
      return reviewsHref(r, params);
    }
    case 'appointments_list':
      return appointmentsListHref(roleRoutePrefix(r));
    case 'appointment': {
      if (intent.conversation) {
        return conversationHref(r, intent.appointmentId, {
          fromNotification: '1',
          ...(intent.messageId ? { messageId: intent.messageId } : {}),
        });
      }
      const hasCareGallery = r === 'nurse' || r === 'pro';
      if (hasCareGallery && intent.careGallery && intent.carePhotoId) {
        return carePhotoHref(r, intent.appointmentId, intent.carePhotoId);
      }
      const params: RouteParams = {};
      if (intent.review) params.review = '1';
      if (hasCareGallery && intent.careGallery) params.careGallery = '1';
      return appointmentDetailHref(roleRoutePrefix(r), intent.appointmentId, params);
    }
    case 'patient_transmissions':
      if (options?.isPharmacyAccount) return null;
      return transmissionsHref(r, intent.patientId);
    // La fiche passage mobile s'ouvre depuis un arrêt (RDV) : une série ouvre la tournée du jour.
    case 'passage_series':
    case 'nurse_tour':
      return r === 'nurse' ? nurseTourHref(intent.date) : null;
    case 'none':
      return null;
  }
}
