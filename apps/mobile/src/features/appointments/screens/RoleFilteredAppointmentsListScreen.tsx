import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { Appointment } from '@oneandlab/shared-types';
import { isBloodTestAppointment, isPendingIncomingOffer } from '@oneandlab/shared-utils';
import { EmptyState } from '@/components/ui/EmptyState';
import { InfiniteQueryFlatList } from '@/components/ui/InfiniteQueryFlatList';
import { AppointmentsBookCta } from '@/features/appointments/components/AppointmentsBookCta';
import { AppointmentsFilterSheet } from '@/features/appointments/components/AppointmentsFilterSheet';
import { AppointmentListRowCard } from '@/features/appointments/components/AppointmentListRowCard';
import type { AppointmentListRow } from '@/utils/appointment-batch';
import { buildAppointmentDisplayRows } from '@/utils/appointment-list-sort';
import { AppointmentsListFilterBar } from '@/features/appointments/components/AppointmentsListFilterBar';
import {
  flattenInfiniteAppointments,
  useInfiniteAppointmentsList,
} from '@/features/appointments/hooks/use-infinite-appointments-list';
import { APPOINTMENTS_LIST_PAGE_SIZE } from '@/constants/appointments-pagination';
import { useAppForegroundRefetch } from '@/lib/hooks/use-network-status';
import { useAuthStore } from '@/store/auth-store';
import { appointmentAddressLine } from '@/utils/appointment-display';
import {
  PRELEVEUR_STATUS_OPTIONS,
  PRO_STATUS_OPTIONS,
  type PreleveurStatusFilter,
  type ProStatusFilter,
} from '@/constants/appointments-list-filters';
import { EMPTY_RDV_IMAGE, EMPTY_RDV_IMAGE_HEIGHT, EMPTY_RDV_IMAGE_WIDTH } from '@/constants/empty-state-images';
import { colors, spacing } from '@/theme';
import type { Href } from 'expo-router';

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
    appointmentAddressLine(apt).toLowerCase().includes(s)
  );
}

/** Aligné web — missions assignées + offres entrantes (pas les RDV créés par le préleveur). */
function isVisibleToPreleveur(apt: Appointment, userId: string | undefined): boolean {
  if (!isBloodTestAppointment(apt)) return false;
  if (userId && String(apt.assigned_to ?? '') === String(userId)) return true;
  return isPendingIncomingOffer(apt, userId);
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
  bookHref?: Href;
  bookLabel?: string;
}

export function RoleFilteredAppointmentsListScreen({
  role,
  detailPathPrefix,
  bookHref,
  bookLabel,
}: Props) {
  const router = useRouter();
  const userId = useAuthStore((s) => s.user?.id);
  const statusOptions = role === 'pro' ? PRO_STATUS_OPTIONS : PRELEVEUR_STATUS_OPTIONS;

  const [status, setStatus] = useState<ProStatusFilter | PreleveurStatusFilter>('all');
  const [search, setSearch] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);

  const listFilters = useMemo(() => {
    const base = { limit: APPOINTMENTS_LIST_PAGE_SIZE };
    if (role !== 'preleveur') return base;
    const prel = { ...base, type: 'blood_test' as const };
    if (status !== 'pending') {
      return { ...prel, assigned_only: true as const };
    }
    return prel;
  }, [role, status]);

  const query = useInfiniteAppointmentsList(listFilters);
  const data = useMemo(
    () => flattenInfiniteAppointments(query.data?.pages),
    [query.data?.pages],
  );
  const { refetch } = query;

  const filtered = useMemo(() => {
    let list = data ?? [];
    if (role === 'preleveur') {
      list = list.filter((a) => isVisibleToPreleveur(a, userId));
    }
    list = list.filter((a) =>
      role === 'pro'
        ? matchesProStatus(a, status as ProStatusFilter)
        : matchesPreleveurStatus(a, status as PreleveurStatusFilter),
    );
    if (search.trim()) list = list.filter((a) => matchesSearch(a, search));
    return list;
  }, [data, role, status, search, userId]);

  const sortDirection = status === 'done' ? ('past' as const) : ('upcoming' as const);

  const displayRows = useMemo(
    () => buildAppointmentDisplayRows(filtered, { direction: sortDirection }),
    [filtered, sortDirection],
  );

  useAppForegroundRefetch(() => {
    void refetch();
  });

  const onStatusChange = useCallback((v: ProStatusFilter | PreleveurStatusFilter) => {
    setStatus(v);
    setSheetOpen(false);
  }, []);

  const filterChips = useMemo(() => {
    if (status === 'all') return [];
    const label = statusOptions.find((t) => t.value === status)?.label ?? status;
    return [{ key: 'status', label, onRemove: () => setStatus('all') }];
  }, [status, statusOptions]);

  const advancedCount = status !== 'all' ? 1 : 0;

  const renderItem = useCallback(
    ({ item: row, index }: { item: AppointmentListRow; index: number }) => (
      <AppointmentListRowCard
        row={row}
        index={index}
        role={role}
        onPress={(apt) => {
          router.push(`${detailPathPrefix}/${apt.id}` as never);
        }}
      />
    ),
    [detailPathPrefix, role, router],
  );

  const ListHeader = useCallback(() => {
    if (!bookHref) return null;
    return (
      <View style={styles.listHeader}>
        <AppointmentsBookCta href={bookHref} label={bookLabel ?? 'Prendre un rendez-vous'} />
      </View>
    );
  }, [bookHref, bookLabel]);

  return (
    <View style={styles.container}>
      <InfiniteQueryFlatList
        query={query}
        items={displayRows}
        header={
          <AppointmentsListFilterBar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Nom, soin, adresse…"
            onOpenFilters={() => setSheetOpen(true)}
            advancedFilterCount={advancedCount}
            chips={filterChips}
          />
        }
        renderItem={renderItem}
        keyExtractor={(item) => (item.kind === 'batch' ? item.key : item.appointment.id)}
        ListHeaderComponent={bookHref ? ListHeader : undefined}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        skeletonHeight={116}
        ListEmptyComponent={
          <EmptyState
            imageSource={EMPTY_RDV_IMAGE}
            imageWidth={EMPTY_RDV_IMAGE_WIDTH}
            imageHeight={EMPTY_RDV_IMAGE_HEIGHT}
            title="Aucun rendez-vous"
            description="Modifiez les filtres pour élargir la liste."
          />
        }
      />

      <AppointmentsFilterSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Filtres"
        search=""
        onSearchChange={() => {}}
        showSearch={false}
        closeOnPick
        onReset={() => setStatus('all')}
        segments={statusOptions}
        segment={status}
        onSegmentChange={onStatusChange}
        segmentSectionLabel="Statut"
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
  listHeader: {
    gap: spacing[2],
    marginBottom: spacing[1],
  },
});
