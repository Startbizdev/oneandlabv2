import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import type { Appointment } from '@oneandlab/shared-types';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { SkeletonList } from '@/components/ui/skeletons';
import { QueryFlatList } from '@/components/ui/QueryFlatList';
import { AppointmentListRowCard } from '@/features/appointments/components/AppointmentListRowCard';
import { fetchAppointmentsPaginated } from '@/features/appointments/api/appointments.service';
import { useAppointmentDetail } from '@/features/appointments/hooks/use-appointment-detail';
import {
  appointmentDetailBlockReason,
  resolveAppointmentDetail,
} from '@/features/appointments/hooks/appointment-detail-result';
import { AppointmentDetailBlockedEmptyState } from '../detail/components/AppointmentDetailBlockedEmptyState';
import { buildAppointmentDisplayRows } from '@/utils/appointment-list-sort';
import {
  appointmentListItemKey,
  withAppointmentDaySections,
  type AppointmentListItem,
} from '@/utils/appointment-list-sections';
import { AppointmentListSectionHeader } from '../components/AppointmentListSectionHeader';
import { PatientPaginationBar } from '../detail/components/patient/PatientPaginationBar';
import { StackChromeScreen } from '@/navigation/StackChromeScreen';
import { appointmentDetailHref } from '@/navigation/role-hrefs';
import { spacing, useStyles, type Theme } from '@/theme';

const PAGE_SIZE = 8;
const PAST_STATUSES = 'completed,canceled,cancelled,refused,expired';

export function PatientAppointmentHistoryScreen() {
  const styles = useStyles(buildStyles);

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
  const items = useMemo(
    () => withAppointmentDaySections(displayRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)),
    [displayRows, page],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: AppointmentListItem; index: number }) =>
      item.kind === 'section' ? (
        <AppointmentListSectionHeader label={item.label} />
      ) : (
        <AppointmentListRowCard
          row={item}
          index={index}
          role="patient"
          onPress={(apt) => router.push(appointmentDetailHref('/(patient)', apt.id))}
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

  if (detailQ.isError && !primary) {
    return (
      <StackChromeScreen>
        <View style={styles.loading}>
          <ErrorState error={detailQ.error} onRetry={() => void detailQ.refetch()} />
        </View>
      </StackChromeScreen>
    );
  }

  const detailBlock = appointmentDetailBlockReason(detailQ.data);
  if (detailBlock) {
    return (
      <StackChromeScreen>
        <AppointmentDetailBlockedEmptyState onBack={() => router.back()} block={detailBlock} />
      </StackChromeScreen>
    );
  }

  if (detailQ.isPending && !primary) {
    return (
      <StackChromeScreen>
        <View style={styles.loading}>
          <SkeletonList count={4} itemHeight={116} gap={12} />
        </View>
      </StackChromeScreen>
    );
  }

  return (
    <StackChromeScreen>
    <QueryFlatList
      query={historyQ}
      items={items}
      keyExtractor={appointmentListItemKey}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
      skeletonHeight={116}
      ListFooterComponent={ListFooter}
      renderItem={renderItem}
      ListEmptyComponent={
        <EmptyState
          illustration="history"
          title="Aucune visite passée"
          description="Les visites terminées pour cette personne s’afficheront ici."
        />
      }
    />
    </StackChromeScreen>
  );
}

function buildStyles({ colors: c }: Theme) {
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
