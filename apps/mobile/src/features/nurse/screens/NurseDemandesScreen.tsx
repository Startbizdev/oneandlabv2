import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { isPendingIncomingOffer } from '@oneandlab/shared-utils';
import { EmptyState } from '@/components/ui/EmptyState';
import { QueryFlatList } from '@/components/ui/QueryFlatList';
import { PlanLimitsBanner } from '@/features/nurse/components/PlanLimitsBanner';
import { NurseDemandesOfferCard } from '@/features/nurse/components/NurseDemandesOfferCard';
import type { AppointmentListRow } from '@/utils/appointment-batch';
import { buildAppointmentDisplayRows } from '@/utils/appointment-list-sort';
import { useAppointmentsList } from '@/features/appointments/hooks/use-appointments-list';
import { NURSE_DEMANDES_LIST_FILTERS } from '@/features/nurse/hooks/use-nurse-demandes-badge';
import { useOpenIncomingOffer } from '@/features/nurse/hooks/use-open-incoming-offer';
import { useAppForegroundRefetch } from '@/lib/hooks/use-network-status';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/store/auth-store';
import { spacing, useStyles, type Theme } from '@/theme';

export function NurseDemandesScreen() {
  const styles = useStyles(buildStyles);

  const user = useAuthStore((s) => s.user);

  const qc = useQueryClient();
  const query = useAppointmentsList(NURSE_DEMANDES_LIST_FILTERS);
  const { data, refetch } = query;

  const incoming = useMemo(() => {
    const list = data ?? [];
    return list.filter(
      (a) =>
        a.status === 'pending' &&
        isPendingIncomingOffer(a, user?.id) &&
        (a.assigned_nurse_id === user?.id || !a.assigned_nurse_id),
    );
  }, [data, user?.id]);

  const displayRows = useMemo(
    () =>
      buildAppointmentDisplayRows(incoming, {
        direction: 'upcoming',
        groupMode: 'nurse-demandes',
      }),
    [incoming],
  );

  const refreshScreen = useCallback(
    () => Promise.all([refetch(), qc.invalidateQueries({ queryKey: queryKeys.planLimits.current })]),
    [qc, refetch],
  );

  const refetchList = useCallback(() => {
    void refreshScreen();
  }, [refreshScreen]);

  useAppForegroundRefetch(refetchList);

  const openOffer = useOpenIncomingOffer(refetchList);

  const renderItem = useCallback(
    ({ item: row, index }: { item: AppointmentListRow; index: number }) => (
      <NurseDemandesOfferCard row={row} index={index} onPress={(apt) => openOffer(row, apt)} />
    ),
    [openOffer],
  );

  const ListHeader = useCallback(
    () => (
      <View style={styles.listHeader}>
        <PlanLimitsBanner />
      </View>
    ),
    [styles.listHeader],
  );

  return (
    <View style={styles.container} collapsable={false}>
      <QueryFlatList
        query={query}
        refresh={refreshScreen}
        items={displayRows}
        renderItem={renderItem}
        keyExtractor={(item) => (item.kind === 'batch' ? item.key : item.appointment.id)}
        ListHeaderComponent={ListHeader}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        skeletonHeight={168}
        ListEmptyComponent={
          <EmptyState
            title="Aucune demande"
            description="Les nouvelles demandes de soins apparaîtront ici."
            illustration="requests"
          />
        }
      />
    </View>
  );
}

function buildStyles({ colors: c }: Theme) {
  return {
    container: { minWidth: 0, flex: 1, backgroundColor: c.background },
    listContent: {
      minWidth: 0,
      paddingHorizontal: spacing[4],
      paddingTop: spacing[4],
      paddingBottom: spacing[8],
      flexGrow: 1,
    },
    listHeader: { marginBottom: spacing[3] },
  };
}
