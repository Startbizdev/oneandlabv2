import { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import type { Appointment } from '@oneandlab/shared-types';
import { EmptyState } from '@/components/ui/EmptyState';
import { InfiniteQueryFlatList } from '@/components/ui/InfiniteQueryFlatList';
import { AppointmentsBookCta } from '@/features/appointments/components/AppointmentsBookCta';
import { AppointmentsFilterSheet } from '@/features/appointments/components/AppointmentsFilterSheet';
import { AppointmentListRowCard } from '@/features/appointments/components/AppointmentListRowCard';
import { AppointmentListSectionHeader } from '@/features/appointments/components/AppointmentListSectionHeader';
import { buildAppointmentDisplayRows } from '@/utils/appointment-list-sort';
import {
  appointmentListItemKey,
  withAppointmentDaySections,
  type AppointmentListItem,
} from '@/utils/appointment-list-sections';
import { AppointmentsListSearchHost } from '@/features/appointments/components/AppointmentsListFilterBar';
import {
  flattenInfiniteAppointments,
  useInfiniteAppointmentsList,
} from '@/features/appointments/hooks/use-infinite-appointments-list';
import { APPOINTMENTS_LIST_PAGE_SIZE } from '@/constants/appointments-pagination';
import { useAppForegroundRefetch } from '@/lib/hooks/use-network-status';
import { useAppointmentsCacheSyncOnFocus } from '@/features/appointments/hooks/use-appointments-cache-sync';
import { appointmentAddressLine } from '@/utils/appointment-display';
import { isAppointmentPastForList } from '@/utils/patient-appointment-list';
import { PRO_STATUS_OPTIONS, type ProStatusFilter } from '@/constants/appointments-list-filters';
import { appointmentDetailHref } from '@/navigation/role-hrefs';
import { spacing, useStyles, type Theme } from '@/theme';

const PENDING = new Set(['pending', 'assigned', 'offered']);
const ACTIVE = new Set(['confirmed', 'inprogress', 'in_progress', 'on_the_way']);

/**
 * Filtre statut côté API (`GET /appointments?status=a,b`) pour que la pagination ne ramène
 * que des lignes utiles. « Terminés » mêle statut terminal et date passée : filtré côté client.
 */
const PRO_SERVER_STATUS: Record<ProStatusFilter, string | undefined> = {
  all: 'pending,confirmed,inProgress,planned',
  pending: 'pending',
  active: 'confirmed,inProgress',
  done: undefined,
};

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

function matchesProStatus(apt: Appointment, filter: ProStatusFilter): boolean {
  const st = String(apt.status ?? '').toLowerCase();
  const past = isAppointmentPastForList(apt);
  if (filter === 'done') return past;
  if (past) return false;
  if (filter === 'all') return true;
  if (filter === 'pending') return PENDING.has(st);
  if (filter === 'active') return ACTIVE.has(st);
  return false;
}

interface Props {
  bookHref?: Href;
  bookLabel?: string;
}

/** Onglet Rendez-vous du professionnel de santé : recherche, filtre statut, création. */
export function RoleFilteredAppointmentsListScreen({ bookHref, bookLabel }: Props) {
  const styles = useStyles(buildStyles);
  const router = useRouter();

  const [status, setStatus] = useState<ProStatusFilter>('all');
  const [search, setSearch] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);

  const listFilters = useMemo(() => {
    const base = { limit: APPOINTMENTS_LIST_PAGE_SIZE };
    const serverStatus = PRO_SERVER_STATUS[status];
    return serverStatus ? { ...base, status: serverStatus } : base;
  }, [status]);

  const query = useInfiniteAppointmentsList(listFilters);
  const data = useMemo(() => flattenInfiniteAppointments(query.data?.pages), [query.data?.pages]);
  const { refetch } = query;

  const filtered = useMemo(() => {
    const list = data.filter((a) => matchesProStatus(a, status));
    return search.trim() ? list.filter((a) => matchesSearch(a, search)) : list;
  }, [data, status, search]);

  const sortDirection = status === 'done' ? ('past' as const) : ('upcoming' as const);

  const items = useMemo(
    () => withAppointmentDaySections(buildAppointmentDisplayRows(filtered, { direction: sortDirection })),
    [filtered, sortDirection],
  );

  useAppForegroundRefetch(() => {
    void refetch();
  });
  useAppointmentsCacheSyncOnFocus();

  const onStatusChange = useCallback((v: ProStatusFilter) => {
    setStatus(v);
    setSheetOpen(false);
  }, []);

  const filterChips = useMemo(() => {
    if (status === 'all') return [];
    const label = PRO_STATUS_OPTIONS.find((t) => t.value === status)?.label ?? status;
    return [{ key: 'status', label, onRemove: () => setStatus('all') }];
  }, [status]);

  const renderItem = useCallback(
    ({ item, index }: { item: AppointmentListItem; index: number }) =>
      item.kind === 'section' ? (
        <AppointmentListSectionHeader label={item.label} />
      ) : (
        <AppointmentListRowCard
          row={item}
          index={index}
          role="pro"
          onPress={(apt) => {
            router.push(appointmentDetailHref('/(pro)', apt.id));
          }}
        />
      ),
    [router],
  );

  const ListHeader = useCallback(
    () => (
      <View style={styles.scrollHeader}>
        <AppointmentsListSearchHost
          embedded
          followedByBookCta={bookHref != null}
          onQueryChange={setSearch}
          searchPlaceholder="Nom, soin, adresse…"
          onOpenFilters={() => setSheetOpen(true)}
          advancedFilterCount={status !== 'all' ? 1 : 0}
          chips={filterChips}
        />
        {bookHref != null ? (
          <AppointmentsBookCta href={bookHref} {...(bookLabel != null ? { label: bookLabel } : {})} />
        ) : null}
      </View>
    ),
    [bookHref, bookLabel, filterChips, status, styles.scrollHeader],
  );

  const emptyState = search.trim() ? (
    <EmptyState illustration="search" title="Aucun résultat" description="Essayez un autre nom, soin ou adresse." />
  ) : status !== 'all' ? (
    <EmptyState
      illustration="appointments"
      title="Aucun rendez-vous"
      description="Aucun rendez-vous avec ce filtre."
      actionLabel="Retirer le filtre"
      onAction={() => setStatus('all')}
    />
  ) : (
    <EmptyState illustration="appointments" title="Aucun rendez-vous à venir" />
  );

  return (
    <View style={styles.container} collapsable={false}>
      <InfiniteQueryFlatList
        query={query}
        items={items}
        renderItem={renderItem}
        keyExtractor={appointmentListItemKey}
        ListHeaderComponent={ListHeader}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        skeletonHeight={116}
        ListEmptyComponent={emptyState}
      />

      <AppointmentsFilterSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Filtres"
        closeOnPick
        segments={PRO_STATUS_OPTIONS}
        segment={status}
        onSegmentChange={onStatusChange}
        segmentSectionLabel="Statut"
      />
    </View>
  );
}

function buildStyles({ colors: c }: Theme) {
  return {
    container: { minWidth: 0, flex: 1, backgroundColor: c.background },
    listContent: {
      minWidth: 0,
      paddingHorizontal: spacing[4],
      paddingBottom: spacing[8],
      flexGrow: 1,
    },
    scrollHeader: {
      alignSelf: 'stretch' as const,
      width: '100%' as const,
    },
  };
}
