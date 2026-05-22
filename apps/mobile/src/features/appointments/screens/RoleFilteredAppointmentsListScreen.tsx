import { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CalendarDays } from 'lucide-react-native';
import type { Appointment } from '@oneandlab/shared-types';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonGroup } from '@/components/ui/Skeleton';
import { AppointmentListRowCard } from '@/features/appointments/components/AppointmentListRowCard';
import {
  groupAppointmentsByBatch,
  type AppointmentListRow,
} from '@/utils/appointment-batch';
import { AppointmentsListFilterBar } from '@/features/appointments/components/AppointmentsListFilterBar';
import { useAppointmentsList } from '@/features/appointments/hooks/use-appointments-list';
import { useAppForegroundRefetch } from '@/lib/hooks/use-network-status';
import {
  PRELEVEUR_STATUS_OPTIONS,
  PRO_STATUS_OPTIONS,
  type PreleveurStatusFilter,
  type ProStatusFilter,
} from '@/constants/appointments-list-filters';
import { colors, spacing } from '@/theme';

const PENDING = new Set(['pending', 'assigned', 'offered']);
const ACTIVE = new Set(['confirmed', 'in_progress', 'on_the_way']);
const DONE = new Set(['completed', 'canceled', 'cancelled', 'refused']);

function matchesSearch(apt: Appointment, q: string): boolean {
  const s = q.toLowerCase().trim();
  if (!s) return true;
  const fd = apt.form_data as Record<string, unknown> | undefined;
  const name = `${fd?.first_name ?? ''} ${fd?.last_name ?? ''}`.toLowerCase();
  return (
    name.includes(s) ||
    (apt.category_name ?? '').toLowerCase().includes(s) ||
    String(apt.address ?? '').toLowerCase().includes(s)
  );
}

function matchesProStatus(apt: Appointment, filter: ProStatusFilter): boolean {
  const st = String(apt.status ?? '').toLowerCase();
  if (filter === 'all') return true;
  if (filter === 'pending') return PENDING.has(st);
  if (filter === 'active') return ACTIVE.has(st);
  return DONE.has(st);
}

function matchesPreleveurStatus(apt: Appointment, filter: PreleveurStatusFilter): boolean {
  const st = String(apt.status ?? '').toLowerCase();
  if (filter === 'all') return true;
  if (filter === 'pending') return PENDING.has(st) || st === 'pending';
  if (filter === 'confirmed') return ACTIVE.has(st);
  return DONE.has(st);
}

type RoleKind = 'pro' | 'preleveur';

interface Props {
  role: RoleKind;
  detailPathPrefix: string;
}

export function RoleFilteredAppointmentsListScreen({ role, detailPathPrefix }: Props) {
  const router = useRouter();
  const statusOptions = role === 'pro' ? PRO_STATUS_OPTIONS : PRELEVEUR_STATUS_OPTIONS;

  const [status, setStatus] = useState<ProStatusFilter | PreleveurStatusFilter>('all');
  const [search, setSearch] = useState('');

  const { data, isLoading, refetch, isRefetching } = useAppointmentsList({ limit: 100 });

  const filtered = useMemo(() => {
    let list = data ?? [];
    list = list.filter((a) =>
      role === 'pro'
        ? matchesProStatus(a, status as ProStatusFilter)
        : matchesPreleveurStatus(a, status as PreleveurStatusFilter),
    );
    if (search.trim()) list = list.filter((a) => matchesSearch(a, search));
    return list;
  }, [data, role, status, search]);

  const displayRows = useMemo(
    () => groupAppointmentsByBatch(filtered),
    [filtered],
  );

  useAppForegroundRefetch(() => { void refetch(); });

  const renderItem = useCallback(
    ({ item: row, index }: { item: AppointmentListRow; index: number }) => (
      <AppointmentListRowCard
        row={row}
        index={index}
        onPress={(apt) => {
          router.push(`${detailPathPrefix}/${apt.id}` as never);
        }}
      />
    ),
    [detailPathPrefix, router],
  );

  return (
    <View style={styles.container}>
      <AppointmentsListFilterBar
        search={search}
        onSearchChange={setSearch}
        segmentTabs={statusOptions}
        segmentTab={status}
        onSegmentTabChange={setStatus}
      />

      {isLoading ? (
        <View style={styles.skeleton}>
          <SkeletonGroup count={4} height={108} gap={12} />
        </View>
      ) : (
        <FlatList
          data={displayRows}
          renderItem={renderItem}
          keyExtractor={(item) => (item.kind === 'batch' ? item.key : item.appointment.id)}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <EmptyState
              Icon={CalendarDays}
              title="Aucun rendez-vous"
              description="Modifiez les filtres pour élargir la liste."
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  skeleton: { paddingHorizontal: spacing[4] },
  listContent: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[8],
    flexGrow: 1,
  },
});
