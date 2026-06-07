import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { Appointment } from '@oneandlab/shared-types';
import { EmptyState } from '@/components/ui/EmptyState';
import { InfiniteQueryFlatList } from '@/components/ui/InfiniteQueryFlatList';
import { AppointmentListRowCard } from '@/features/appointments/components/AppointmentListRowCard';
import { AppointmentsListFilterBar } from '@/features/appointments/components/AppointmentsListFilterBar';
import {
  flattenInfiniteAppointments,
  useInfiniteAppointmentsList,
} from '@/features/appointments/hooks/use-infinite-appointments-list';
import { APPOINTMENTS_LIST_PAGE_SIZE } from '@/constants/appointments-pagination';
import { useAppForegroundRefetch } from '@/lib/hooks/use-network-status';
import { useAuthStore } from '@/store/auth-store';
import type { AppointmentListRow } from '@/utils/appointment-batch';
import { buildAppointmentDisplayRows } from '@/utils/appointment-list-sort';
import { appointmentAddressLine } from '@/utils/appointment-display';
import { EMPTY_RDV_IMAGE, EMPTY_RDV_IMAGE_HEIGHT, EMPTY_RDV_IMAGE_WIDTH } from '@/constants/empty-state-images';
import { colors, spacing } from '@/theme';

const CONFIRMED_STATUSES = new Set(['confirmed', 'in_progress', 'on_the_way']);

function matchesSearch(apt: Appointment, q: string): boolean {
  const s = q.toLowerCase().trim();
  if (!s) return true;
  const fd = apt.form_data as Record<string, unknown> | undefined;
  const name = `${fd?.first_name ?? ''} ${fd?.last_name ?? ''}`.toLowerCase();
  return (
    name.includes(s) ||
    (apt.category_name ?? '').toLowerCase().includes(s) ||
    appointmentAddressLine(apt).toLowerCase().includes(s)
  );
}

/** Même logique que Tournée — RDV blood_test assignés à ce préleveur, statuts confirmés actifs. */
function isAssignedConfirmed(apt: Appointment, userId: string | undefined): boolean {
  if (!userId) return false;
  if (String(apt.type ?? '') !== 'blood_test') return false;
  if (String(apt.assigned_to ?? '') !== String(userId)) return false;
  return CONFIRMED_STATUSES.has(String(apt.status ?? '').toLowerCase());
}

interface Props {
  detailPathPrefix: string;
}

export function PreleveurAppointmentsListScreen({ detailPathPrefix }: Props) {
  const router = useRouter();
  const userId = useAuthStore((s) => s.user?.id);
  const [search, setSearch] = useState('');

  const query = useInfiniteAppointmentsList({
    limit: APPOINTMENTS_LIST_PAGE_SIZE,
    type: 'blood_test',
    assigned_only: true,
    status: 'confirmed,in_progress,on_the_way',
  });

  const { refetch } = query;

  const displayRows = useMemo(() => {
    let list = flattenInfiniteAppointments(query.data?.pages).filter((a) =>
      isAssignedConfirmed(a, userId),
    );
    if (search.trim()) list = list.filter((a) => matchesSearch(a, search));
    return buildAppointmentDisplayRows(list, { direction: 'upcoming' });
  }, [query.data?.pages, search, userId]);

  useAppForegroundRefetch(() => {
    void refetch();
  });

  const renderItem = useCallback(
    ({ item: row, index }: { item: AppointmentListRow; index: number }) => (
      <AppointmentListRowCard
        row={row}
        index={index}
        role="preleveur"
        onPress={(apt) => {
          router.push(`${detailPathPrefix}/${apt.id}` as never);
        }}
      />
    ),
    [detailPathPrefix, router],
  );

  const ListHeader = useCallback(
    () => (
      <AppointmentsListFilterBar
        embedded
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Nom, adresse, soin…"
      />
    ),
    [search],
  );

  return (
    <View style={styles.container}>
      <InfiniteQueryFlatList
        query={query}
        items={displayRows}
        renderItem={renderItem}
        keyExtractor={(item) => (item.kind === 'batch' ? item.key : item.appointment.id)}
        ListHeaderComponent={ListHeader}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        skeletonHeight={116}
        ListEmptyComponent={
          !query.isPending ? (
            <EmptyState
              imageSource={EMPTY_RDV_IMAGE}
              imageWidth={EMPTY_RDV_IMAGE_WIDTH}
              imageHeight={EMPTY_RDV_IMAGE_HEIGHT}
              title="Aucun rendez-vous"
              description="Vos missions confirmées apparaîtront ici."
            />
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  listContent: {
    paddingHorizontal: spacing[4],
    paddingTop: 0,
    paddingBottom: spacing[8],
    flexGrow: 1,
  },
  listHeaderComponent: {
    paddingTop: 0,
    marginTop: 0,
  },
});
