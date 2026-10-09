import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';

/** Toutes les listes (envoyées, reçues, patient) et, si fourni, le détail et les échanges de la commande. */
export function invalidatePharmacyOrders(qc: QueryClient, orderId?: string): Promise<void> {
  const keys: readonly (readonly string[])[] = orderId
    ? [
        queryKeys.pharmacyOrders.lists,
        queryKeys.pharmacyOrders.detail(orderId),
        queryKeys.pharmacyOrders.messages(orderId),
      ]
    : [queryKeys.pharmacyOrders.lists];
  return Promise.all(keys.map((queryKey) => qc.invalidateQueries({ queryKey }))).then(() => undefined);
}
