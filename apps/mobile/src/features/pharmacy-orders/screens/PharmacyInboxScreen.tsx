import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Clock, History, Inbox } from 'lucide-react-native';
import {
  countPharmacyOrdersBySegment,
  filterPharmacyOrdersBySegment,
  type PharmacyOrderListSegment,
} from '@oneandlab/shared-utils';
import { EmptyState } from '@/components/ui/EmptyState';
import { FullWidthSegmentBar } from '@/components/ui/FullWidthSegmentBar';
import { PharmacyOrderCard } from '../components/PharmacyOrderCard';
import { fetchPharmacyOrders } from '../api/pharmacy-orders.service';
import { queryKeys } from '@/lib/query-keys';
import { StackChromeScreen } from '@/navigation/StackChromeScreen';
import { useStackScrollConfig } from '@/navigation/use-stack-scroll-config';
import { spreadTabSceneScrollProps } from '@/components/navigation/liquid-glass-header-inset';
import { useManualRefresh } from '@/lib/hooks/use-manual-refresh';
import { spacing } from '@/theme';

export function PharmacyInboxScreen() {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'PharmacyInboxScreen');
  const router = useRouter();
  const scrollConfig = useStackScrollConfig(styles.content);
  const [segment, setSegment] = useState<PharmacyOrderListSegment>('active');

  const ordersQ = useQuery({
    queryKey: queryKeys.pharmacyOrders.list('received'),
    queryFn: async () => {
      const res = await fetchPharmacyOrders('received');
      if (!res.success || !res.data) throw new Error(res.error ?? 'Chargement impossible');
      return res.data;
    },
  });

  const { refreshing, onRefresh } = useManualRefresh(() => ordersQ.refetch());

  const openOrder = useCallback(
    (id: string) => router.push(`/(pro)/commandes-recues/${id}` as never),
    [router],
  );

  const orders = ordersQ.data ?? [];
  const counts = useMemo(() => countPharmacyOrdersBySegment(orders), [orders]);
  const filteredOrders = useMemo(
    () => filterPharmacyOrdersBySegment(orders, segment),
    [orders, segment],
  );

  const emptyTitle =
    segment === 'active' ? 'Aucune commande en cours' : 'Aucune commande dans l’historique';
  const emptyDescription =
    segment === 'active'
      ? 'Les nouvelles commandes adressées à votre officine apparaîtront ici.'
      : 'Les commandes terminées, refusées ou annulées apparaîtront ici.';

  return (
    <StackChromeScreen>
      <ScrollView
        contentContainerStyle={scrollConfig.contentContainerStyle}
        {...spreadTabSceneScrollProps(scrollConfig)}
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
        ) : ordersQ.isError ? (
          <EmptyState
            Icon={Inbox}
            title="Chargement impossible"
            description={ordersQ.error instanceof Error ? ordersQ.error.message : 'Réessayez dans un instant.'}
            actionLabel="Réessayer"
            onAction={() => void ordersQ.refetch()}
          />
        ) : filteredOrders.length === 0 ? (
          <EmptyState Icon={Inbox} title={emptyTitle} description={emptyDescription} />
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

function buildStyles(_c: AppColors) {
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
