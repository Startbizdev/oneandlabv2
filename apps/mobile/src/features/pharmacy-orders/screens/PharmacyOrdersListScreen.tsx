import { useAppColors } from '@/theme/use-app-colors';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { Clock, History, Plus } from 'lucide-react-native';
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
import { pharmacyOrderDetailHref, pharmacyOrderNewHref } from '@/navigation/role-hrefs';
import type { StaffRoutePrefix } from '@/navigation/role-route-prefix';
import { HeaderAction } from '@/components/navigation/HeaderAction';
import { useManualRefresh } from '@/lib/hooks/use-manual-refresh';
import { usePharmacyModuleEnabled } from '../hooks/use-pharmacy-module-enabled';
import { useAppActive } from '@/lib/hooks/use-app-active';
import { focusedRefetchInterval } from '@/lib/focused-refetch-interval';
import { spacing, useStyles } from '@/theme';

const PHARMACY_ORDER_LIST_POLL_MS = 15_000;

/** Le patient voit des « traitements » (onglet Mes traitements), les soignants des commandes. */
const LIST_COPY = {
  sent: {
    emptyActive: 'Aucune commande en cours',
    emptyHistory: 'Aucune commande passée',
    error: 'Commandes indisponibles',
    newOrder: 'Nouvelle commande',
  },
  patient: {
    emptyActive: 'Aucun traitement en cours',
    emptyHistory: 'Aucun traitement passé',
    error: 'Traitements indisponibles',
    newOrder: 'Commander en pharmacie',
  },
} as const;

interface Props {
  rolePrefix: StaffRoutePrefix | '/(patient)';
  scope?: 'sent' | 'patient';
}

export function PharmacyOrdersListScreen({ rolePrefix, scope = 'sent' }: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const router = useRouter();
  const focused = useIsFocused();
  const appActive = useAppActive();
  const [segment, setSegment] = useState<PharmacyOrderListSegment>('active');

  const ordersQ = useQuery({
    queryKey: queryKeys.pharmacyOrders.list(scope),
    queryFn: async () => {
      const res = await fetchPharmacyOrders(scope);
      if (!res.success || !res.data) throw new Error(res.error ?? 'Chargement impossible');
      return res.data;
    },
    refetchInterval: focusedRefetchInterval(PHARMACY_ORDER_LIST_POLL_MS, focused, appActive),
    refetchIntervalInBackground: false,
  });

  const { refreshing, onRefresh } = useManualRefresh(() => ordersQ.refetch());

  const openOrder = useCallback(
    (id: string) => router.push(pharmacyOrderDetailHref(rolePrefix, id)),
    [rolePrefix, router],
  );

  const { canOrder: canCreate } = usePharmacyModuleEnabled();
  const openNew = useCallback(() => router.push(pharmacyOrderNewHref(rolePrefix)), [rolePrefix, router]);

  const orders = useMemo(() => ordersQ.data ?? [], [ordersQ.data]);
  const counts = useMemo(() => countPharmacyOrdersBySegment(orders), [orders]);
  const filteredOrders = useMemo(
    () => filterPharmacyOrdersBySegment(orders, segment),
    [orders, segment],
  );

  const copy = LIST_COPY[scope];
  const headerRight = canCreate ? (
    <HeaderAction icon={Plus} accessibilityLabel={copy.newOrder} onPress={openNew} />
  ) : null;

  const emptyTitle = segment === 'active' ? copy.emptyActive : copy.emptyHistory;

  return (
    <StackChromeScreen headerRight={headerRight}>
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
            title={copy.error}
            error={ordersQ.error}
            onRetry={() => void ordersQ.refetch()}
          />
        ) : filteredOrders.length === 0 ? (
          <EmptyState
            illustration="pharmacy"
            title={emptyTitle}
            actionLabel={canCreate && segment === 'active' ? copy.newOrder : undefined}
            onAction={canCreate && segment === 'active' ? openNew : undefined}
          />
        ) : (
          <View style={styles.list}>
            {filteredOrders.map((order) => (
              <PharmacyOrderCard
                key={order.id}
                order={order}
                variant="sent"
                patientView={scope === 'patient'}
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
      paddingTop: spacing[4],
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
