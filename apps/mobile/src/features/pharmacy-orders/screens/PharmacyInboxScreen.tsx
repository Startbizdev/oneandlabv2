import { useAppColors } from '@/theme/use-app-colors';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { Clock, History } from 'lucide-react-native';
import {
  countPharmacyOrdersBySegment,
  filterPharmacyOrdersBySegment,
  type PharmacyOrderListSegment,
} from '@oneandlab/shared-utils';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { FullWidthSegmentBar } from '@/components/ui/FullWidthSegmentBar';
import { PharmacyOrderCard } from '../components/PharmacyOrderCard';
import { fetchPharmacyOrders } from '../api/pharmacy-orders.service';
import { queryKeys } from '@/lib/query-keys';
import { StackChromeScreen } from '@/navigation/StackChromeScreen';
import { useManualRefresh } from '@/lib/hooks/use-manual-refresh';
import { useAppActive } from '@/lib/hooks/use-app-active';
import { focusedRefetchInterval } from '@/lib/focused-refetch-interval';
import { spacing, useStyles } from '@/theme';

const PHARMACY_ORDER_LIST_POLL_MS = 15_000;

export function PharmacyInboxScreen() {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const router = useRouter();
  const focused = useIsFocused();
  const appActive = useAppActive();
  const [segment, setSegment] = useState<PharmacyOrderListSegment>('active');

  const ordersQ = useQuery({
    queryKey: queryKeys.pharmacyOrders.list('received'),
    queryFn: async () => {
      const res = await fetchPharmacyOrders('received');
      if (!res.success || !res.data) throw new Error(res.error ?? 'Chargement impossible');
      return res.data;
    },
    refetchInterval: focusedRefetchInterval(PHARMACY_ORDER_LIST_POLL_MS, focused, appActive),
    refetchIntervalInBackground: false,
  });

  const { refreshing, onRefresh } = useManualRefresh(() => ordersQ.refetch());

  const openOrder = useCallback(
    (id: string) => router.push({ pathname: '/(pro)/commandes-recues/[id]', params: { id } }),
    [router],
  );

  const orders = useMemo(() => ordersQ.data ?? [], [ordersQ.data]);
  const counts = useMemo(() => countPharmacyOrdersBySegment(orders), [orders]);
  const filteredOrders = useMemo(
    () => filterPharmacyOrdersBySegment(orders, segment),
    [orders, segment],
  );

  const emptyTitle = segment === 'active' ? 'Aucune commande à traiter' : 'Aucune commande passée';

  return (
    <StackChromeScreen>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.segmentWrap}>
          <FullWidthSegmentBar
            segments={[
              { id: 'active' as const, label: 'En cours', Icon: Clock, badge: counts.active || undefined },
              { id: 'history' as const, label: 'Historique', Icon: History, badge: counts.history || undefined },
            ]}
            value={segment}
            onChange={setSegment}
          />
        </View>

        {ordersQ.isLoading ? (
          <ActivityIndicator style={styles.loader} color={c.primary} />
        ) : ordersQ.isError && !ordersQ.data ? (
          <ErrorState
            title="Commandes indisponibles"
            error={ordersQ.error}
            onRetry={() => void ordersQ.refetch()}
          />
        ) : filteredOrders.length === 0 ? (
          <EmptyState
            illustration="pharmacy"
            title={emptyTitle}
            {...(segment === 'active' ? { description: 'Les commandes adressées à votre officine arrivent ici.' } : {})}
          />
        ) : (
          <View style={styles.list}>
            {filteredOrders.map((order) => (
              <PharmacyOrderCard
                key={order.id}
                order={order}
                variant="received"
                onPress={() => openOrder(order.id)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </StackChromeScreen>
  );
}

function buildStyles() {
  return {
    content: {
      paddingHorizontal: spacing[4],
      paddingBottom: spacing[10],
    },
    segmentWrap: {
      marginBottom: spacing[3],
    },
    list: {
      gap: spacing[2.5],
    },
    loader: { marginTop: spacing[8], marginBottom: spacing[8] },
  };
}
