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
export function usePharmacyOrdersList(scope: 'sent' | 'received' | 'patient') {
  const focused = useIsFocused();
  const appActive = useAppActive();

  const ordersQ = useQuery({
    queryKey: queryKeys.pharmacyOrders.list(scope),
    queryFn: async () => {
      const res = await fetchPharmacyOrders(scope);
      if (!res.success || !res.data) throw new Error(res.error ?? 'Chargement impossible');
      return res.data;
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
