import type { PharmacyOrderStatus } from '@oneandlab/shared-types';

export type PharmacyOrderListSegment = 'active' | 'history';

const ACTIVE_STATUSES: PharmacyOrderStatus[] = [
  'en_attente',
  'acceptee',
  'en_cours',
  'complement_demande',
];

export function isPharmacyOrderActiveStatus(status: PharmacyOrderStatus): boolean {
  return ACTIVE_STATUSES.includes(status);
}

export function filterPharmacyOrdersBySegment<T extends { status: PharmacyOrderStatus }>(
  orders: T[],
  segment: PharmacyOrderListSegment,
): T[] {
  return orders.filter((order) =>
    segment === 'active'
      ? isPharmacyOrderActiveStatus(order.status)
      : !isPharmacyOrderActiveStatus(order.status),
  );
}

export function countPharmacyOrdersBySegment<T extends { status: PharmacyOrderStatus }>(
  orders: T[],
): Record<PharmacyOrderListSegment, number> {
  let active = 0;
  let history = 0;
  for (const order of orders) {
    if (isPharmacyOrderActiveStatus(order.status)) active += 1;
    else history += 1;
  }
  return { active, history };
}
