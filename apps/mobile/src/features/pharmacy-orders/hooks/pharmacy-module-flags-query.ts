import { queryOptions } from '@tanstack/react-query';
import { fetchPharmacyModuleFlags } from '../api/pharmacy-orders.service';
import { queryKeys } from '@/lib/query-keys';

/** Partagé par le hook et les handlers hors React (notifications push). */
export function pharmacyModuleFlagsQueryOptions(userId: string) {
  return queryOptions({
    queryKey: queryKeys.pharmacyOrders.flags(userId),
    queryFn: async () => {
      const res = await fetchPharmacyModuleFlags();
      if (!res.success || !res.data) throw new Error(res.error ?? 'Module indisponible');
      return res.data;
    },
    staleTime: 60_000,
  });
}
