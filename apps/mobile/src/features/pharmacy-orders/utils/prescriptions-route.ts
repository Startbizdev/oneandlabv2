import type { Href } from 'expo-router';
import type { StaffRoutePrefix } from '@/navigation/role-route-prefix';

export type PharmacyOrderDetailMode = 'sent' | 'received';

export type PharmacyOrderRoutePrefix = StaffRoutePrefix | '/(patient)';

type RouteParams = Record<string, string>;

/** Ordonnances jointes à une commande : soignant (envoyée / reçue) et patient (traitement). */
export function pharmacyOrderPrescriptionsHref(
  rolePrefix: PharmacyOrderRoutePrefix,
  mode: PharmacyOrderDetailMode,
  orderId: string,
): Href | null {
  if (!orderId) return null;
  const params = { id: orderId };
  switch (rolePrefix) {
    case '/(patient)':
      return { pathname: '/(patient)/traitements/[id]/ordonnances', params };
    case '/(nurse)':
      return { pathname: '/(nurse)/commandes-pharmacie/[id]/ordonnances', params };
    case '/(pro)':
      return mode === 'received'
        ? { pathname: '/(pro)/commandes-recues/[id]/ordonnances', params }
        : { pathname: '/(pro)/commandes-pharmacie/[id]/ordonnances', params };
  }
}

/** Messages d'une commande ; `messageId` (notification) fait défiler jusqu'au message. */
export function pharmacyOrderMessagesHref(
  rolePrefix: PharmacyOrderRoutePrefix,
  mode: PharmacyOrderDetailMode,
  orderId: string,
  messageId?: string,
): Href | null {
  if (!orderId) return null;
  const params: RouteParams = { id: orderId };
  if (messageId) params.messageId = messageId;
  switch (rolePrefix) {
    case '/(patient)':
      return { pathname: '/(patient)/traitements/[id]/messages', params };
    case '/(nurse)':
      return { pathname: '/(nurse)/commandes-pharmacie/[id]/messages', params };
    case '/(pro)':
      return mode === 'received'
        ? { pathname: '/(pro)/commandes-recues/[id]/messages', params }
        : { pathname: '/(pro)/commandes-pharmacie/[id]/messages', params };
  }
}
