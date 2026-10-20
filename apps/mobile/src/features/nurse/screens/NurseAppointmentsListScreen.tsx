import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  View,
  type ListRenderItem,
} from 'react-native';
import { useRouter } from 'expo-router';
import { isNursePassageAppointment, isPendingIncomingOffer } from '@oneandlab/shared-utils';
import type { Appointment } from '@oneandlab/shared-types';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { SkeletonList } from '@/components/ui/skeletons';
import { useScreenFabScrollClearance } from '@/components/ui/ScreenFab';
import { useOpenIncomingOffer } from '@/features/nurse/hooks/use-open-incoming-offer';
import { AppointmentListRowCard } from '@/features/appointments/components/AppointmentListRowCard';
import type { AppointmentListRow } from '@/utils/appointment-batch';
import { buildAppointmentDisplayRows, sortAppointmentListRows } from '@/utils/appointment-list-sort';
import { Badge } from '@/components/ui/Badge';
import { nursePassageDetailHref } from '@/features/tournee-nurse/utils/passage-detail-href';
import { AppointmentsFilterSheet } from '@/features/appointments/components/AppointmentsFilterSheet';
import { AppointmentsListSearchHost } from '@/features/appointments/components/AppointmentsListFilterBar';
import {
  flattenInfiniteAppointments,
  useInfiniteAppointmentsList,
} from '@/features/appointments/hooks/use-infinite-appointments-list';
import { APPOINTMENTS_LIST_PAGE_SIZE } from '@/constants/appointments-pagination';
import { useAppointmentsCacheSyncOnFocus } from '@/features/appointments/hooks/use-appointments-cache-sync';
import { useAppForegroundRefetch } from '@/lib/hooks/use-network-status';
import { useManualRefresh } from '@/lib/hooks/use-manual-refresh';
import { useScrollToTopOnPop } from '@/lib/hooks/use-scroll-to-top-on-pop';
import { useAuthStore } from '@/store/auth-store';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { appointmentDetailHref } from '@/navigation/role-hrefs';
import { useAppColors } from '@/theme/use-app-colors';
import {
  NURSE_SEGMENT_OPTIONS,
  NURSE_TAB_OPTIONS,
  normalizeNurseSegment,
  nurseSegmentPeriod,
  type NurseListTab,
  type NurseSegment,
} from '@/constants/appointments-list-filters';
import { isAppointmentPastForList } from '@/utils/patient-appointment-list';
import { spacing, useStyles, type Theme } from '@/theme';

function rowKey(row: AppointmentListRow): string {
  return row.kind === 'batch' ? row.key : row.appointment.id;
}

function isIncomingOfferRow(row: AppointmentListRow, userId: string | undefined): boolean {
  const apts = row.kind === 'batch' ? row.appointments : [row.appointment];
  return apts.some((a) => a.status === 'pending' && isPendingIncomingOffer(a, userId));
}

/** Liste RDV infirmier — FlatList paginée (`onEndReached`, y compris sur une liste courte). */
export function NurseAppointmentsListScreen() {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const scrollRef = useRef<FlatList<AppointmentListRow>>(null);
  useScrollToTopOnPop(scrollRef);
  const fabClearance = useScreenFabScrollClearance();

  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [tab, setTab] = useState<NurseListTab>('soins');
  const [segment, setSegment] = useState<NurseSegment>('tous');
  const [search, setSearch] = useState('');
  /** Recherche faite par le serveur sur tous les RDV (et pas seulement les pages chargées). */
  const debouncedSearch = useDebouncedValue(search).trim();
  const [sheetOpen, setSheetOpen] = useState(false);

  const apiSegment = segment === 'tous' ? undefined : normalizeNurseSegment(segment);

  const query = useInfiniteAppointmentsList({
    nurse_tab: tab,
    nurse_segment: apiSegment,
    patient_period: nurseSegmentPeriod(segment),
    limit: APPOINTMENTS_LIST_PAGE_SIZE,
    ...(debouncedSearch ? { q: debouncedSearch } : {}),
  });

  const data = useMemo(() => flattenInfiniteAppointments(query.data?.pages), [query.data?.pages]);

  const { refetch, fetchNextPage, hasNextPage, isFetchingNextPage, isFetchNextPageError } = query;
  const { refreshing, onRefresh } = useManualRefresh(refetch);

  const filtered = useMemo(() => {
    let list = data ?? [];
    if (segment !== 'historique') {
      list = list.filter((a) => !isAppointmentPastForList(a));
    }
    return list;
  }, [data, segment]);

  const sortDirection = segment === 'historique' ? ('past' as const) : ('upcoming' as const);

  /** Un passage infirmier = une visite : une carte par passage, jamais regroupé en lot. */
  const displayRows = useMemo((): AppointmentListRow[] => {
    const grouped = buildAppointmentDisplayRows(
      filtered.filter((a) => !isNursePassageAppointment(a)),
      {
        direction: sortDirection,
        groupMode: tab === 'soins' && segment === 'en_attente' ? 'nurse-demandes' : 'batch',
      },
    );
    const passages = filtered
      .filter(isNursePassageAppointment)
      .map((appointment): AppointmentListRow => ({ kind: 'single', appointment }));
    return sortAppointmentListRows([...grouped, ...passages], sortDirection);
  }, [filtered, tab, segment, sortDirection]);

  const refetchList = useCallback(() => {
    void refetch();
  }, [refetch]);

  useAppointmentsCacheSyncOnFocus();
  useAppForegroundRefetch(refetchList);
  const openOffer = useOpenIncomingOffer(refetchList);

  const filterChips = useMemo(() => {
    if (tab === 'soins') return [];
    const tabLabel = NURSE_TAB_OPTIONS.find((t) => t.value === tab)?.label ?? tab;
    return [{ key: 'tab', label: tabLabel, onRemove: () => setTab('soins') }];
  }, [tab]);

  const advancedCount = tab !== 'soins' ? 1 : 0;
  const isInitialLoading = query.isPending && !query.data;
  const isInitialError = query.isError && !query.data;

  const canLoadMore = Boolean(hasNextPage) && !isFetchingNextPage && !isFetchNextPageError;

  const loadMore = useCallback(() => {
    if (canLoadMore) void fetchNextPage();
  }, [canLoadMore, fetchNextPage]);

  /** Les RDV passés sont masqués côté client : on enchaîne les pages tant que l'écran n'est pas rempli. */
  useEffect(() => {
    if (!query.data || filtered.length >= APPOINTMENTS_LIST_PAGE_SIZE) return;
    loadMore();
  }, [query.data, filtered.length, loadMore]);

  const isDemandesSegment = segment === 'en_attente';

  const onRowPress = useCallback(
    (row: AppointmentListRow, apt: Appointment, isOffer: boolean) => {
      if (isOffer && user?.id) {
        openOffer(row, apt);
      } else if (isNursePassageAppointment(apt)) {
        router.push(
          nursePassageDetailHref({
            passage_series_id: apt.passage_series_id,
            appointment_id: apt.id,
            stop_id: '',
          }),
        );
      } else {
        router.push(appointmentDetailHref('/(nurse)', apt.id));
      }
    },
    [openOffer, router, user?.id],
  );

  const renderRow: ListRenderItem<AppointmentListRow> = useCallback(
    ({ item: row, index }) => {
      const isOffer = isDemandesSegment && isIncomingOfferRow(row, user?.id);
      return (
        <AppointmentListRowCard
          row={row}
          index={index}
          role={isOffer ? 'demande' : 'nurse'}
          viewerId={user?.id}
          onPress={(apt) => onRowPress(row, apt, isOffer)}
          footer={
            row.kind === 'single' && isNursePassageAppointment(row.appointment) ? (
              <View style={styles.badgeRow}>
                <Badge label="Passage" variant="primary" size="sm" />
              </View>
            ) : undefined
          }
        />
      );
    },
    [isDemandesSegment, onRowPress, styles.badgeRow, user?.id],
  );

  const searching = debouncedSearch.length > 0;
  const emptyTitle = searching ? 'Aucun résultat' : isDemandesSegment ? 'Aucune demande' : 'Aucun rendez-vous';
  const emptyDescription = searching
    ? 'Essayez un autre nom, téléphone, soin ou adresse.'
    : isDemandesSegment
      ? 'Les nouvelles demandes s’afficheront ici.'
      : 'Les soins acceptés s’afficheront ici.';

  return (
    <View style={styles.screen}>
      <View style={styles.scrollHeader}>
        <AppointmentsListSearchHost
          embedded
          onQueryChange={setSearch}
          searchPlaceholder="Nom, téléphone, adresse…"
          onOpenFilters={() => setSheetOpen(true)}
          advancedFilterCount={advancedCount}
          chips={filterChips}
        />
      </View>
      {isInitialLoading ? (
        <View style={styles.skeleton}>
          <SkeletonList count={4} itemHeight={116} gap={spacing[3]} />
        </View>
      ) : isInitialError ? (
        <View style={styles.emptyWrap}>
          <ErrorState
            title="Rendez-vous indisponibles"
            error={query.error}
            onRetry={() => void refetch()}
          />
        </View>
      ) : (
        <FlatList
          ref={scrollRef}
          style={styles.list}
          data={displayRows}
          keyExtractor={rowKey}
          renderItem={renderRow}
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled={Platform.OS === 'android'}
          contentContainerStyle={[styles.listContent, { paddingBottom: spacing[4] + fabClearance }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            isFetchingNextPage || hasNextPage ? null : (
              <View style={styles.emptyWrap}>
                <EmptyState
                  title={emptyTitle}
                  description={emptyDescription}
                  illustration={searching ? 'search' : isDemandesSegment ? 'requests' : 'appointments'}
                />
              </View>
            )
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator color={c.primary} />
              </View>
            ) : null
          }
        />
      )}

      <AppointmentsFilterSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Filtres"
        closeOnPick={false}
        onReset={() => {
          setTab('soins');
          setSegment('tous');
        }}
        tabs={NURSE_TAB_OPTIONS}
        tab={tab}
        onTabChange={setTab}
        segments={NURSE_SEGMENT_OPTIONS}
        segment={segment}
        onSegmentChange={setSegment}
        segmentSectionLabel="Statut"
      />
    </View>
  );
}

function buildStyles({ colors: c }: Theme) {
  return {
    screen: { minWidth: 0, minHeight: 0, flex: 1, backgroundColor: c.background },
    list: { minWidth: 0, minHeight: 0, flex: 1 },
    listContent: {
      minWidth: 0,
      paddingHorizontal: spacing[4],
      paddingTop: spacing[2],
      paddingBottom: spacing[8],
      flexGrow: 1,
    },
    scrollHeader: {
      alignSelf: 'stretch' as const,
      width: '100%' as const,
      paddingHorizontal: spacing[4],
    },
    skeleton: { minWidth: 0, flex: 1, paddingHorizontal: spacing[4], paddingTop: spacing[2] },
    badgeRow: { flexDirection: 'row' as const },
    emptyWrap: {
      minWidth: 0,
      flexGrow: 1,
      justifyContent: 'center' as const,
      paddingVertical: spacing[6],
    },
    footerLoader: {
      paddingVertical: spacing[4],
      alignItems: 'center' as const,
    },
  };
}
