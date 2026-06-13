import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import type { Appointment } from '@oneandlab/shared-types';
import { EmptyState } from '@/components/ui/EmptyState';
import { EMPTY_RDV_IMAGE, EMPTY_RDV_IMAGE_HEIGHT, EMPTY_RDV_IMAGE_WIDTH } from '@/constants/empty-state-images';
import { SkeletonList } from '@/components/ui/skeletons';
import { QueryFlatList } from '@/components/ui/QueryFlatList';
import { AppointmentListRowCard } from '@/features/appointments/components/AppointmentListRowCard';
import { fetchAppointmentsPaginated } from '@/features/appointments/api/appointments.service';
import { useAppointmentDetail } from '@/features/appointments/hooks/use-appointment-detail';
import { resolveAppointmentDetail } from '@/features/appointments/hooks/appointment-detail-result';
import type { AppointmentListRow } from '@/utils/appointment-batch';
import { buildAppointmentDisplayRows } from '@/utils/appointment-list-sort';
import { PatientPaginationBar } from '../detail/components/patient/PatientPaginationBar';
import { spacing } from '@/theme';

const PAGE_SIZE = 8;
const PAST_STATUSES = 'completed,canceled,cancelled,refused,expired';

export function PatientAppointmentHistoryScreen() {
  const styles = useThemedStyles(buildStyles, 'features_appointments_screens_PatientAppointmentHistoryScreen_tsx_PatientAppointmentHistoryScreen_styles');

  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [page, setPage] = useState(1);

  const detailQ = useAppointmentDetail(id);
  const primary = resolveAppointmentDetail(detailQ.data) ?? undefined;
  const relativeId = (primary as Appointment & { relative_id?: string })?.relative_id ?? null;

  const historyQ = useQuery({
    queryKey: ['patient', 'appointment-history', id, relativeId] as const,
    queryFn: async () => {
      const { appointments } = await fetchAppointmentsPaginated({
        page: 1,
        limit: 120,
        status: PAST_STATUSES,
      });
      let filtered = appointments.filter((a) => a.id !== id);
      if (relativeId) {
        filtered = filtered.filter(
          (a) =>
            String((a as Appointment & { relative_id?: string }).relative_id ?? '') ===
            relativeId,
        );
      }
      return filtered;
    },
    enabled: Boolean(id && primary),
    staleTime: 60_000,
  });

  const displayRows = useMemo(
    () =>
      buildAppointmentDisplayRows(historyQ.data ?? [], {
        direction: 'past',
        groupMode: 'batch',
      }),
    [historyQ.data],
  );

  const pages = Math.max(1, Math.ceil(displayRows.length / PAGE_SIZE));
  const items = displayRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const renderItem = useCallback(
    ({ item: row, index }: { item: AppointmentListRow; index: number }) => (
      <AppointmentListRowCard
        row={row}
        index={index}
        role="patient"
        onPress={(apt) => router.push(`/(patient)/appointment/${apt.id}` as never)}
      />
    ),
    [router],
  );

  const ListFooter = useMemo(
    () =>
      displayRows.length > PAGE_SIZE ? (
        <PatientPaginationBar
          page={page}
          pages={pages}
          total={displayRows.length}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => Math.min(pages, p + 1))}
        />
      ) : null,
    [displayRows.length, page, pages],
  );

  if (detailQ.isPending && !primary) {
    return (
      <View style={styles.loading}>
        <SkeletonList count={4} itemHeight={116} gap={12} />
      </View>
    );
  }

  return (
    <QueryFlatList
      query={historyQ}
      items={items}
      keyExtractor={(item) => (item.kind === 'batch' ? item.key : item.appointment.id)}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
      skeletonHeight={116}
      ListFooterComponent={ListFooter}
      renderItem={renderItem}
      ListEmptyComponent={
        <EmptyState
          imageSource={EMPTY_RDV_IMAGE}
          imageWidth={EMPTY_RDV_IMAGE_WIDTH}
          imageHeight={EMPTY_RDV_IMAGE_HEIGHT}
          title="Aucun historique"
          description="Les rendez-vous passés apparaîtront ici."
        />
      }
    />
  );
}

function buildStyles(c: AppColors) {
  return {
  loading: {
    minWidth: 0,
    flex: 1,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    backgroundColor: c.background,
  },
  list: {
    minWidth: 0,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[8],
    flexGrow: 1,
    backgroundColor: c.background,
  },
};
}
