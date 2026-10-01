import type { Href } from 'expo-router';
import type { StaffRoutePrefix } from '@/navigation/role-route-prefix';

export type PharmacyOrderDetailMode = 'sent' | 'received';

export function pharmacyOrderPrescriptionsHref(
  rolePrefix: StaffRoutePrefix | undefined,
  mode: PharmacyOrderDetailMode,
  orderId: string,
): Href | null {
  if (!rolePrefix || !orderId) return null;
  const params = { id: orderId };
  if (rolePrefix === '/(nurse)') {
    return { pathname: '/(nurse)/commandes-pharmacie/[id]/ordonnances', params };
  }
  if (mode === 'received') {
    return { pathname: '/(pro)/commandes-recues/[id]/ordonnances', params };
  }
  return { pathname: '/(pro)/commandes-pharmacie/[id]/ordonnances', params };
}
