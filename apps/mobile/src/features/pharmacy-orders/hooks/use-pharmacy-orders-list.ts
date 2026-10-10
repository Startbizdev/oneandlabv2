import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { fetchPharmacyOrders } from '../api/pharmacy-orders.service';
import { queryKeys } from '@/lib/query-keys';
import { useAppActive } from '@/lib/hooks/use-app-active';
import { focusedRefetchInterval } from '@/lib/focused-refetch-interval';

const PHARMACY_ORDER_LIST_POLL_MS = 15_000;

/** Liste toujours fraîche : rechargée à chaque retour sur l'écran, puis interrogée tant qu'il est visible. */
export function usePharmacyOrdersList(
  scope: 'sent' | 'received' | 'patient',
  segment?: 'active' | 'history',
) {
  const focused = useIsFocused();
  const appActive = useAppActive();

  const ordersQ = useQuery({
    queryKey: queryKeys.pharmacyOrders.list(`${scope}:${segment ?? 'all'}`),
    queryFn: async () => {
      const res = await fetchPharmacyOrders(scope, segment);
      if (!res.success || !res.data) throw new Error(res.error ?? 'Chargement impossible');
      return {
        orders: res.data,
        counts: {
          active: Number(res.counts?.active ?? 0),
          history: Number(res.counts?.history ?? 0),
        },
      };
    },
    staleTime: 0,
    refetchInterval: focusedRefetchInterval(PHARMACY_ORDER_LIST_POLL_MS, focused, appActive),
    refetchIntervalInBackground: false,
  });

  const { refetch } = ordersQ;
  useFocusEffect(
    useCallback(() => {
      void refetch({ cancelRefetch: false });
    }, [refetch]),
  );

  return ordersQ;
}
