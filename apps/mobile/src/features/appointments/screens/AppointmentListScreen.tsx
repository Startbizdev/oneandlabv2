import { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { AppointmentListFilters } from '@oneandlab/shared-types';
import { EmptyState } from '@/components/ui/EmptyState';
import { QueryFlatList } from '@/components/ui/QueryFlatList';
import { PlanLimitsBanner } from '@/features/nurse/components/PlanLimitsBanner';
import { useAuthStore } from '@/store/auth-store';
import { AppointmentListRowCard } from '../components/AppointmentListRowCard';
import type { AppointmentListRow } from '@/utils/appointment-batch';
import { buildAppointmentDisplayRows } from '@/utils/appointment-list-sort';
import { useAppointmentsList } from '../hooks/use-appointments-list';
import { useAppForegroundRefetch } from '@/lib/hooks/use-network-status';
import { EMPTY_RDV_IMAGE, EMPTY_RDV_IMAGE_HEIGHT, EMPTY_RDV_IMAGE_WIDTH } from '@/constants/empty-state-images';
import { colors, spacing } from '@/theme';

interface Props {
  filters: AppointmentListFilters;
  detailPathPrefix: string;
  newAppointmentPath?: string;
}

export function AppointmentListScreen({
  filters,
  detailPathPrefix,
}: Props) {
  const router = useRouter();
  const role = useAuthStore((s) => s.user?.role);
  const query = useAppointmentsList(filters);
  const { data, refetch } = query;

  useAppForegroundRefetch(() => {
    void refetch();
  });

  const displayRows = useMemo(
    () => buildAppointmentDisplayRows(data ?? [], { direction: 'upcoming' }),
    [data],
  );

  const cardRole =
    role === 'nurse' || role === 'pro' || role === 'preleveur' || role === 'lab'
      ? role
      : 'patient';

  const renderItem = useCallback(
    ({ item: row, index }: { item: AppointmentListRow; index: number }) => (
      <AppointmentListRowCard
        row={row}
        index={index}
        role={cardRole}
        onPress={(apt) => router.push(`${detailPathPrefix}/${apt.id}` as never)}
      />
    ),
    [router, detailPathPrefix, cardRole],
  );

  const ListHeader = useCallback(
    () => (
      <View style={styles.listHeader}>
        {role === 'nurse' ? <PlanLimitsBanner /> : null}
      </View>
    ),
    [role],
  );

  return (
    <View style={styles.container}>
      <QueryFlatList
        query={query}
        items={displayRows}
        renderItem={renderItem}
        keyExtractor={(item) => (item.kind === 'batch' ? item.key : item.appointment.id)}
        ListHeaderComponent={ListHeader}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            title="Aucun rendez-vous"
            description="Votre liste est vide pour le moment."
            imageSource={EMPTY_RDV_IMAGE}
            imageWidth={EMPTY_RDV_IMAGE_WIDTH}
            imageHeight={EMPTY_RDV_IMAGE_HEIGHT}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[4],
  },
  listHeader: {
    gap: spacing[3],
    marginBottom: spacing[1],
  },
});
