import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import { isPendingIncomingOffer } from '@oneandlab/shared-utils';
import type { Appointment } from '@oneandlab/shared-types';
import {
  buildTabSceneScrollConfig,
  spreadTabSceneScrollProps,
  useTabSceneInsets,
} from '@/components/navigation/liquid-glass-header-inset';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonList } from '@/components/ui/skeletons';
import { BookAppointmentCta } from '@/features/nurse/components/BookAppointmentCta';
import { NurseTourBanner } from '@/features/nurse/components/NurseTourBanner';
import { PlanLimitsBanner } from '@/features/nurse/components/PlanLimitsBanner';
import { AppointmentListRowCard } from '@/features/appointments/components/AppointmentListRowCard';
import type { AppointmentListRow } from '@/utils/appointment-batch';
import { offerPreviewFromListRow } from '@/utils/appointment-batch';
import { buildAppointmentDisplayRows } from '@/utils/appointment-list-sort';
import { AppointmentsFilterSheet } from '@/features/appointments/components/AppointmentsFilterSheet';
import { AppointmentsListSearchHost } from '@/features/appointments/components/AppointmentsListFilterBar';
import {
  flattenInfiniteAppointments,
  useInfiniteAppointmentsList,
} from '@/features/appointments/hooks/use-infinite-appointments-list';
import { APPOINTMENTS_LIST_PAGE_SIZE } from '@/constants/appointments-pagination';
import { useOfferQueueStore } from '@/features/appointments/store/offer-queue-store';
import { useToast } from '@/providers/ToastProvider';
import { useAppointmentsCacheSyncOnFocus } from '@/features/appointments/hooks/use-appointments-cache-sync';
import { useAppForegroundRefetch } from '@/lib/hooks/use-network-status';
import { useManualRefresh } from '@/lib/hooks/use-manual-refresh';
import { useScrollToTopOnPop } from '@/lib/hooks/use-scroll-to-top-on-pop';
import { useAuthStore } from '@/store/auth-store';
import { useAppColors } from '@/theme/use-app-colors';
import {
  NURSE_SEGMENT_OPTIONS,
  NURSE_TAB_OPTIONS,
  normalizeNurseSegment,
  type NurseListTab,
  type NurseSegment,
} from '@/constants/appointments-list-filters';
import {
  EMPTY_DEMANDE_IMAGE,
  EMPTY_DEMANDE_IMAGE_HEIGHT,
  EMPTY_DEMANDE_IMAGE_WIDTH,
  EMPTY_RDV_IMAGE,
  EMPTY_RDV_IMAGE_HEIGHT,
  EMPTY_RDV_IMAGE_WIDTH,
} from '@/constants/empty-state-images';
import { isAppointmentPastForList } from '@/utils/patient-appointment-list';
import { spacing } from '@/theme';

function matchesSearch(apt: Appointment, q: string): boolean {
  const s = q.toLowerCase().trim();
  if (!s) return true;
  const fd = apt.form_data as Record<string, unknown> | undefined;
  const name = `${fd?.first_name ?? ''} ${fd?.last_name ?? ''}`.toLowerCase();
  const phone = String(fd?.phone ?? '').toLowerCase();
  const addr = String((fd?.address as { label?: string })?.label ?? apt.address ?? '').toLowerCase();
  return (
    name.includes(s) ||
    phone.includes(s) ||
    addr.includes(s) ||
    (apt.category_name ?? '').toLowerCase().includes(s)
  );
}

function rowKey(row: AppointmentListRow): string {
  return row.kind === 'batch' ? row.key : row.appointment.id;
}

/** Liste RDV infirmier — ScrollView natif (pattern PatientsListScreen). */
export function NurseAppointmentsListScreen() {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'NurseAppointmentsListScreen');
  const sceneInsets = useTabSceneInsets();
  const scrollConfig = buildTabSceneScrollConfig(sceneInsets, styles.listContent);
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTopOnPop(scrollRef);

  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { show: toast } = useToast();

  const [tab, setTab] = useState<NurseListTab>('soins');
  const [segment, setSegment] = useState<NurseSegment>('tous');
  const [search, setSearch] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);

  const apiSegment = segment === 'tous' ? undefined : normalizeNurseSegment(segment);

  const query = useInfiniteAppointmentsList({
    nurse_tab: tab,
    nurse_segment: apiSegment,
    limit: APPOINTMENTS_LIST_PAGE_SIZE,
  });

  const data = useMemo(
    () => flattenInfiniteAppointments(query.data?.pages),
    [query.data?.pages],
  );

  const { refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = query;
  const { refreshing, onRefresh } = useManualRefresh(refetch);

  const filtered = useMemo(() => {
    let list = data ?? [];
    if (segment !== 'historique') {
      list = list.filter((a) => !isAppointmentPastForList(a));
    }
    if (search.trim()) list = list.filter((a) => matchesSearch(a, search));
    return list;
  }, [data, search, segment]);

  const sortDirection = segment === 'historique' ? ('past' as const) : ('upcoming' as const);

  const displayRows = useMemo(
    (): AppointmentListRow[] =>
      buildAppointmentDisplayRows(filtered, {
        direction: sortDirection,
        groupMode:
          tab === 'soins' && segment === 'en_attente' ? 'nurse-demandes' : 'batch',
      }),
    [filtered, tab, segment, sortDirection],
  );

  useAppointmentsCacheSyncOnFocus();
  useAppForegroundRefetch(() => {
    void refetch();
  });

  const filterChips = useMemo(() => {
    const chips: Array<{ key: string; label: string; onRemove: () => void }> = [];
    if (tab !== 'soins') {
      const tabLabel = NURSE_TAB_OPTIONS.find((t) => t.value === tab)?.label ?? tab;
      chips.push({ key: 'tab', label: tabLabel, onRemove: () => setTab('soins') });
    }
    if (segment !== 'tous') {
      const label = NURSE_SEGMENT_OPTIONS.find((s) => s.value === segment)?.label ?? segment;
      chips.push({ key: 'segment', label, onRemove: () => setSegment('tous') });
    }
    return chips;
  }, [segment, tab]);

  const advancedCount = (tab !== 'soins' ? 1 : 0) + (segment !== 'tous' ? 1 : 0);
  const isInitialLoading = query.isPending && !query.data;

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
      const pad = Math.max(96, contentSize.height * 0.05);
      if (layoutMeasurement.height + contentOffset.y >= contentSize.height - pad) {
        loadMore();
      }
    },
    [loadMore],
  );

  const onRowPress = useCallback(
    (row: AppointmentListRow, apt: Appointment) => {
      const isOffer =
        segment === 'en_attente' &&
        (row.kind === 'batch'
          ? row.appointments.some(
              (a) => a.status === 'pending' && isPendingIncomingOffer(a, user?.id),
            )
          : row.appointment.status === 'pending' &&
            isPendingIncomingOffer(row.appointment, user?.id));

      if (isOffer && user?.id) {
        const preview = offerPreviewFromListRow(row);
        void useOfferQueueStore.getState().openIncomingOffer(apt.id, 'nurse', user.id, preview).then(
          (result) => {
            if (result.ok) return;
            if (result.reason === 'already_accepted') {
              toast('Ce rendez-vous a déjà été pris par un autre professionnel.', { type: 'info' });
            } else if (result.reason === 'unavailable') {
              toast('Cette demande n’est plus disponible.', { type: 'info' });
            } else if (result.reason === 'network') {
              toast('Connexion instable — réessayez.', { type: 'error' });
            }
            void refetch();
          },
        );
      } else {
        router.push(`/(nurse)/appointment/${apt.id}` as never);
      }
    },
    [refetch, router, segment, toast, user?.id],
  );

  const isDemandesEmpty = segment === 'en_attente';
  const emptyTitle = isDemandesEmpty ? 'Aucune demande pour le moment' : 'Aucune visite pour le moment';
  const emptyDescription = isDemandesEmpty
    ? 'Les nouvelles propositions de soins apparaîtront ici.'
    : 'Quand vous acceptez une demande, elle arrive ici.';

  return (
    <View style={styles.screen}>
      <ScrollView
        ref={scrollRef}
        style={styles.list}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={Platform.OS === 'android'}
        {...spreadTabSceneScrollProps(scrollConfig)}
        contentContainerStyle={scrollConfig.contentContainerStyle}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={c.primary}
            progressViewOffset={scrollConfig.refreshProgressOffset}
          />
        }
        onScroll={handleScroll}
        scrollEventThrottle={200}
      >
        <View style={styles.scrollHeader}>
          <AppointmentsListSearchHost
            embedded
            followedByBookCta
            onQueryChange={setSearch}
            searchPlaceholder="Nom, téléphone, adresse…"
            onOpenFilters={() => setSheetOpen(true)}
            advancedFilterCount={advancedCount}
            chips={filterChips}
          />
          <BookAppointmentCta href="/(nurse)/appointments/new" />
          {tab === 'soins' && (segment === 'acceptes' || segment === 'tous') ? (
            <NurseTourBanner stopCount={filtered.length || undefined} />
          ) : null}
          <PlanLimitsBanner />
        </View>

        {isInitialLoading ? (
          <SkeletonList count={4} itemHeight={116} gap={12} />
        ) : displayRows.length === 0 ? (
          <View style={styles.emptyWrap}>
            <EmptyState
              title={emptyTitle}
              description={emptyDescription}
              imageSource={isDemandesEmpty ? EMPTY_DEMANDE_IMAGE : EMPTY_RDV_IMAGE}
              imageWidth={isDemandesEmpty ? EMPTY_DEMANDE_IMAGE_WIDTH : EMPTY_RDV_IMAGE_WIDTH}
              imageHeight={isDemandesEmpty ? EMPTY_DEMANDE_IMAGE_HEIGHT : EMPTY_RDV_IMAGE_HEIGHT}
            />
          </View>
        ) : (
          <View style={styles.rows}>
            {displayRows.map((row, index) => {
              const isOffer =
                segment === 'en_attente' &&
                (row.kind === 'batch'
                  ? row.appointments.some(
                      (a) => a.status === 'pending' && isPendingIncomingOffer(a, user?.id),
                    )
                  : row.appointment.status === 'pending' &&
                    isPendingIncomingOffer(row.appointment, user?.id));
              return (
                <AppointmentListRowCard
                  key={rowKey(row)}
                  row={row}
                  index={index}
                  role={isOffer ? 'demande' : 'nurse'}
                  viewerId={user?.id}
                  onPress={(apt) => onRowPress(row, apt)}
                />
              );
            })}
          </View>
        )}

        {isFetchingNextPage ? (
          <View style={styles.footerLoader}>
            <ActivityIndicator color={c.primary} />
          </View>
        ) : null}
      </ScrollView>

      <AppointmentsFilterSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Filtres"
        search=""
        onSearchChange={() => {}}
        showSearch={false}
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

function buildStyles(c: AppColors) {
  return {
    screen: {
      minWidth: 0,
      flex: 1,
      backgroundColor: c.background,
    },
    list: {
      minWidth: 0,
      flex: 1,
    },
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
    },
    rows: {
      minWidth: 0,
      alignSelf: 'stretch' as const,
    },
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
