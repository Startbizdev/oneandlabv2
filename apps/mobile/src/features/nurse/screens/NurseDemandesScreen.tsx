import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { isPendingIncomingOffer } from '@oneandlab/shared-utils';
import { EmptyState } from '@/components/ui/EmptyState';
import { QueryFlatList } from '@/components/ui/QueryFlatList';
import { PlanLimitsBanner } from '@/features/nurse/components/PlanLimitsBanner';
import { NurseDemandesOfferCard } from '@/features/nurse/components/NurseDemandesOfferCard';
import type { AppointmentListRow } from '@/utils/appointment-batch';
import { offerPreviewFromListRow } from '@/utils/appointment-batch';
import { buildAppointmentDisplayRows } from '@/utils/appointment-list-sort';
import { useAppointmentsList } from '@/features/appointments/hooks/use-appointments-list';
import { useToast } from '@/providers/ToastProvider';
import { NURSE_DEMANDES_LIST_FILTERS } from '@/features/nurse/hooks/use-nurse-demandes-badge';
import { useOfferQueueStore } from '@/features/appointments/store/offer-queue-store';
import { useAppForegroundRefetch } from '@/lib/hooks/use-network-status';
import { useAuthStore } from '@/store/auth-store';
import { EMPTY_DEMANDE_IMAGE, EMPTY_DEMANDE_IMAGE_HEIGHT, EMPTY_DEMANDE_IMAGE_WIDTH } from '@/constants/empty-state-images';
import { spacing } from '@/theme';

export function NurseDemandesScreen() {
  const styles = useThemedStyles(buildStyles, 'features_nurse_screens_NurseDemandesScreen_tsx_NurseDemandesScreen_styles');

  const user = useAuthStore((s) => s.user);
  const { show: toast } = useToast();

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
          if (!apt?.id || !user?.id) return;
          const preview = offerPreviewFromListRow(row);
          void openIncomingOffer(apt.id, 'nurse', user.id, preview).then((result) => {
            if (result.ok) return;
            if (result.reason === 'already_accepted') {
              toast('Ce rendez-vous a déjà été pris par un autre professionnel.', { type: 'info' });
            } else if (result.reason === 'unavailable') {
              toast('Cette demande n’est plus disponible.', { type: 'info' });
            } else if (result.reason === 'network') {
              toast('Connexion instable — réessayez.', { type: 'error' });
            }
            void refetch();
          });
        }}
      />
    ),
    [openIncomingOffer, refetch, toast, user?.id],
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
            imageSource={EMPTY_DEMANDE_IMAGE}
            imageWidth={EMPTY_DEMANDE_IMAGE_WIDTH}
            imageHeight={EMPTY_DEMANDE_IMAGE_HEIGHT}
          />
        }
      />
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
  container: { minWidth: 0, flex: 1, backgroundColor: c.background },
  listContent: {
    minWidth: 0,
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[8],
    flexGrow: 1,
  },
  listHeader: { marginBottom: spacing[2] },
};
}
