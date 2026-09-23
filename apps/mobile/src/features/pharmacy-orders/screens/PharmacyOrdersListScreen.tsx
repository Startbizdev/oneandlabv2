import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Clock, History, Pill } from 'lucide-react-native';
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
import { HeaderActionButton } from '@/navigation/HeaderActionButton';
import { useStackScrollConfig } from '@/navigation/use-stack-scroll-config';
import { spreadTabSceneScrollProps } from '@/components/navigation/liquid-glass-header-inset';
import { useManualRefresh } from '@/lib/hooks/use-manual-refresh';
import { spacing } from '@/theme';

interface Props {
  rolePrefix: '/(nurse)' | '/(pro)' | '/(patient)';
  canCreate?: boolean;
  scope?: 'sent' | 'patient';
  routeName?: 'commandes-pharmacie' | 'traitements';
}

export function PharmacyOrdersListScreen({
  rolePrefix,
  canCreate = true,
  scope = 'sent',
  routeName = 'commandes-pharmacie',
}: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'PharmacyOrdersListScreen');
  const router = useRouter();
  const scrollConfig = useStackScrollConfig(styles.content);
  const [segment, setSegment] = useState<PharmacyOrderListSegment>('active');

  const ordersQ = useQuery({
    queryKey: queryKeys.pharmacyOrders.list(scope),
    queryFn: async () => {
      const res = await fetchPharmacyOrders(scope);
      if (!res.success || !res.data) throw new Error(res.error ?? 'Chargement impossible');
      return res.data;
    },
  });

  const { refreshing, onRefresh } = useManualRefresh(() => ordersQ.refetch());

  const openOrder = useCallback(
    (id: string) => router.push(`${rolePrefix}/${routeName}/${id}` as never),
    [rolePrefix, routeName, router],
  );

  const openNew = useCallback(
    () => router.push(`${rolePrefix}/${routeName}/new` as never),
    [rolePrefix, routeName, router],
  );

  const orders = ordersQ.data ?? [];
  const counts = useMemo(() => countPharmacyOrdersBySegment(orders), [orders]);
  const filteredOrders = useMemo(
    () => filterPharmacyOrdersBySegment(orders, segment),
    [orders, segment],
  );

  const headerRight = canCreate ? (
    <HeaderActionButton kind="add" onPress={openNew} />
  ) : null;

  const emptyTitle =
    segment === 'active' ? 'Aucune commande en cours' : 'Aucune commande dans l’historique';
  const emptyDescription =
    segment === 'active'
      ? 'Vos commandes en attente ou en préparation apparaîtront ici.'
      : 'Les commandes terminées, refusées ou annulées apparaîtront ici.';

  return (
    <StackChromeScreen headerRight={headerRight}>
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
            Icon={Pill}
            title="Chargement impossible"
            description={ordersQ.error instanceof Error ? ordersQ.error.message : 'Réessayez dans un instant.'}
            actionLabel="Réessayer"
            onAction={() => void ordersQ.refetch()}
          />
        ) : filteredOrders.length === 0 ? (
          <EmptyState
            Icon={Pill}
            title={emptyTitle}
            description={emptyDescription}
            actionLabel={canCreate && segment === 'active' ? 'Nouvelle commande' : undefined}
            onAction={canCreate && segment === 'active' ? openNew : undefined}
          />
        ) : (
          <View style={styles.list}>
            {filteredOrders.map((order) => (
              <PharmacyOrderCard
                key={order.id}
                order={order}
                variant="sent"
                showOrderedBy={scope === 'patient'}
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
