import { useIsFocused } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { focusedRefetchInterval } from '@/lib/focused-refetch-interval';
import { useAppActive } from '@/lib/hooks/use-app-active';
import { queryKeys } from '@/lib/query-keys';
import { fetchPharmacyOrderMessages } from '../api/pharmacy-orders.service';

/** Rafraîchissement d'une commande ouverte (statut, messages), suspendu hors écran. */
export const PHARMACY_ORDER_POLL_MS = 15_000;

/** Fil de messages d'une commande : compteur sur la fiche, conversation sur la vue Messages. */
export function usePharmacyOrderMessages(orderId: string) {
  const focused = useIsFocused();
  const appActive = useAppActive();
  return useQuery({
    queryKey: queryKeys.pharmacyOrders.messages(orderId),
    queryFn: async () => {
      const res = await fetchPharmacyOrderMessages(orderId);
      if (!res.success || !res.data) throw new Error(res.error ?? 'Messages indisponibles');
      return res.data;
    },
    enabled: !!orderId,
    refetchInterval: focusedRefetchInterval(PHARMACY_ORDER_POLL_MS, focused, appActive),
    refetchIntervalInBackground: false,
  });
}
