import { useCallback, useMemo } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { CalendarDays } from 'lucide-react-native';
import type { AppointmentListFilters } from '@oneandlab/shared-types';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonGroup } from '@/components/ui/Skeleton';
import { PlanLimitsBanner } from '@/features/nurse/components/PlanLimitsBanner';
import { useAuthStore } from '@/store/auth-store';
import { AppointmentListRowCard } from '../components/AppointmentListRowCard';
import { groupAppointmentsByBatch, type AppointmentListRow } from '@/utils/appointment-batch';
import { useAppointmentsList } from '../hooks/use-appointments-list';
import { useAppForegroundRefetch } from '@/lib/hooks/use-network-status';
import { colors, spacing } from '@/theme';
import type { Appointment } from '@oneandlab/shared-types';

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
  const { data, isLoading, refetch, isRefetching } = useAppointmentsList(filters);

  const onRefresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  useAppForegroundRefetch(() => {
    void refetch();
  });

  const displayRows = useMemo(
    () => groupAppointmentsByBatch(data ?? []),
    [data],
  );

  const renderItem = useCallback(
    ({ item: row, index }: { item: AppointmentListRow; index: number }) => (
      <AppointmentListRowCard
        row={row}
        index={index}
        onPress={(apt) => router.push(`${detailPathPrefix}/${apt.id}` as never)}
      />
    ),
    [router, detailPathPrefix],
  );

  const ListHeader = useCallback(
    () => (
      <View style={styles.listHeader}>
        {role === 'nurse' ? <PlanLimitsBanner /> : null}
      </View>
    ),
    [role],
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.skeletonContainer}>
          <SkeletonGroup count={5} height={108} gap={12} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={displayRows}
        renderItem={renderItem}
        keyExtractor={(item) => (item.kind === 'batch' ? item.key : item.appointment.id)}
        ListHeaderComponent={ListHeader}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          <EmptyState
            title="Aucun rendez-vous"
            description="Votre liste est vide pour le moment."
            Icon={CalendarDays}
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
  skeletonContainer: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
  },
  listContent: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[4],
    flexGrow: 1,
  },
  listHeader: {
    gap: spacing[3],
    marginBottom: spacing[1],
  },
});
