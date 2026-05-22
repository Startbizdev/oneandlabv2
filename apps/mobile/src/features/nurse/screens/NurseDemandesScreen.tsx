import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Inbox } from 'lucide-react-native';
import { isPendingIncomingOffer } from '@oneandlab/shared-utils';
import { EmptyState } from '@/components/ui/EmptyState';
import { QueryFlatList } from '@/components/ui/QueryFlatList';
import { PlanLimitsBanner } from '@/features/nurse/components/PlanLimitsBanner';
import { NurseDemandesOfferCard } from '@/features/nurse/components/NurseDemandesOfferCard';
import type { AppointmentListRow } from '@/utils/appointment-batch';
import { buildAppointmentDisplayRows } from '@/utils/appointment-list-sort';
import { useAppointmentsList } from '@/features/appointments/hooks/use-appointments-list';
import { NURSE_DEMANDES_LIST_FILTERS } from '@/features/nurse/hooks/use-nurse-demandes-badge';
import { useOfferQueueStore } from '@/features/appointments/store/offer-queue-store';
import { useAppForegroundRefetch } from '@/lib/hooks/use-network-status';
import { useAuthStore } from '@/store/auth-store';
import { colors, spacing } from '@/theme';

export function NurseDemandesScreen() {
  const user = useAuthStore((s) => s.user);

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

  useAppForegroundRefetch(() => {
    void refetch();
  });

  const openIncomingOffer = useOfferQueueStore((s) => s.openIncomingOffer);

  const renderItem = useCallback(
    ({ item: row, index }: { item: AppointmentListRow; index: number }) => (
      <NurseDemandesOfferCard
        row={row}
        index={index}
        onPress={(apt) => {
          if (apt?.id && user?.id) {
            void openIncomingOffer(apt.id, 'nurse', user.id);
          }
        }}
      />
    ),
    [openIncomingOffer, user?.id],
  );

  const ListHeader = useCallback(
    () => (
      <View style={styles.listHeader}>
        <PlanLimitsBanner />
      </View>
    ),
    [],
  );

  return (
    <View style={styles.container}>
      <QueryFlatList
        query={query}
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
            title="Aucune demande en attente"
            description="Les nouvelles propositions de soins apparaîtront ici. La liste se met à jour automatiquement."
            Icon={Inbox}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  listContent: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[8],
    flexGrow: 1,
  },
  listHeader: { marginBottom: spacing[2] },
});
