import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { EmptyState } from '@/components/ui/EmptyState';
import { EMPTY_RDV_IMAGE, EMPTY_RDV_IMAGE_HEIGHT, EMPTY_RDV_IMAGE_WIDTH } from '@/constants/empty-state-images';
import { SkeletonList } from '@/components/ui/skeletons';
import { AppointmentListRowCard } from '@/features/appointments/components/AppointmentListRowCard';
import { PatientPaginationBar } from '@/features/appointments/detail/components/patient/PatientPaginationBar';
import type { AppointmentListRow } from '@/utils/appointment-batch';
import { buildAppointmentDisplayRows } from '@/utils/appointment-list-sort';
import { useAuthStore } from '@/store/auth-store';
import {
  fetchPatientProfile,
  fetchStaffPatientHistoryAppointments,
} from '../api/patient-profile.service';
import { enrichPatientHistoryAppointments } from '../utils/enrich-patient-history-appointments';
import { spacing } from '@/theme';

const PAGE_SIZE = 8;

interface Props {
  rolePrefix: '/(nurse)' | '/(pro)';
}

export function StaffPatientHistoryScreen({ rolePrefix }: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'features_patients_screens_StaffPatientHistoryScreen_tsx_StaffPatientHistoryScreen_styles');

  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [page, setPage] = useState(1);
  const listRole = rolePrefix === '/(pro)' ? 'pro' : 'nurse';

  const profileQ = useQuery({
    queryKey: queryKeys.profile.user(id ?? ''),
    queryFn: async () => {
      const res = await fetchPatientProfile(id!);
      if (!res.success || !res.data) throw new Error(res.error ?? 'Patient introuvable');
      return res.data;
    },
    enabled: Boolean(id),
  });

  const historyQ = useQuery({
    queryKey: queryKeys.patients.history(id ?? ''),
    queryFn: async () => {
      const { appointments } = await fetchStaffPatientHistoryAppointments(id!);
      return appointments;
    },
    enabled: Boolean(id),
  });

  const enrichedAppointments = useMemo(
    () => enrichPatientHistoryAppointments(historyQ.data ?? [], profileQ.data),
    [historyQ.data, profileQ.data],
  );

  const displayRows = useMemo(
    () =>
      buildAppointmentDisplayRows(enrichedAppointments, {
        direction: 'past',
        groupMode: 'batch',
      }),
    [enrichedAppointments],
  );

  const pages = Math.max(1, Math.ceil(displayRows.length / PAGE_SIZE));
  const items = displayRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const renderItem = useCallback(
    ({ item: row, index }: { item: AppointmentListRow; index: number }) => (
      <AppointmentListRowCard
        row={row}
        index={index}
        role={listRole}
        viewerId={user?.id}
        onPress={(apt) => router.push(`${rolePrefix}/appointment/${apt.id}` as never)}
      />
    ),
    [listRole, rolePrefix, router, user?.id],
  );

  const isLoading = historyQ.isLoading || profileQ.isLoading;

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <SkeletonList count={4} itemHeight={116} gap={12} />
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => (item.kind === 'batch' ? item.key : item.appointment.id)}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={historyQ.isRefetching || profileQ.isRefetching}
          onRefresh={() => {
            void historyQ.refetch();
            void profileQ.refetch();
          }}
          tintColor={c.primary}
        />
      }
      renderItem={renderItem}
      ListEmptyComponent={
        <EmptyState
          imageSource={EMPTY_RDV_IMAGE}
          imageWidth={EMPTY_RDV_IMAGE_WIDTH}
          imageHeight={EMPTY_RDV_IMAGE_HEIGHT}
          title="Aucun historique"
          description="Aucun rendez-vous enregistré pour ce patient."
        />
      }
      ListFooterComponent={
        displayRows.length > 0 ? (
          <View style={styles.footer}>
            <PatientPaginationBar
              page={page}
              pages={pages}
              total={displayRows.length}
              onPrev={() => setPage((p) => Math.max(1, p - 1))}
              onNext={() => setPage((p) => Math.min(pages, p + 1))}
            />
          </View>
        ) : null
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
    paddingBottom: spacing[10],
    flexGrow: 1,
    backgroundColor: c.background,
  },
  footer: { marginTop: spacing[4] },
};
}
