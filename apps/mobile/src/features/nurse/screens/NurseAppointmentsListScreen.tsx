import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { isPendingIncomingOffer } from '@oneandlab/shared-utils';
import type { Appointment } from '@oneandlab/shared-types';
import { EmptyState } from '@/components/ui/EmptyState';
import { InfiniteQueryFlatList } from '@/components/ui/InfiniteQueryFlatList';
import { BookAppointmentCta } from '@/features/nurse/components/BookAppointmentCta';
import { PlanLimitsBanner } from '@/features/nurse/components/PlanLimitsBanner';
import { AppointmentListRowCard } from '@/features/appointments/components/AppointmentListRowCard';
import type { AppointmentListRow } from '@/utils/appointment-batch';
import { offerPreviewFromListRow } from '@/utils/appointment-batch';
import { buildAppointmentDisplayRows } from '@/utils/appointment-list-sort';
import { AppointmentsFilterSheet } from '@/features/appointments/components/AppointmentsFilterSheet';
import { AppointmentsListFilterBar } from '@/features/appointments/components/AppointmentsListFilterBar';
import {
  flattenInfiniteAppointments,
  useInfiniteAppointmentsList,
} from '@/features/appointments/hooks/use-infinite-appointments-list';
import { APPOINTMENTS_LIST_PAGE_SIZE } from '@/constants/appointments-pagination';
import { useOfferQueueStore } from '@/features/appointments/store/offer-queue-store';
import { useToast } from '@/providers/ToastProvider';
import { useAppointmentsCacheSyncOnFocus } from '@/features/appointments/hooks/use-appointments-cache-sync';
import { useAppForegroundRefetch } from '@/lib/hooks/use-network-status';
import { useAuthStore } from '@/store/auth-store';
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
import { colors, spacing } from '@/theme';

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

export function NurseAppointmentsListScreen() {
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
  const { refetch } = query;

  const filtered = useMemo(() => {
    const list = data ?? [];
    if (search.trim()) return list.filter((a) => matchesSearch(a, search));
    return list;
  }, [data, search]);

  const displayRows = useMemo(
    (): AppointmentListRow[] =>
      buildAppointmentDisplayRows(filtered, {
        direction: 'upcoming',
        groupMode:
          tab === 'soins' && segment === 'en_attente' ? 'nurse-demandes' : 'batch',
      }),
    [filtered, tab, segment],
  );

  useAppointmentsCacheSyncOnFocus();
  useAppForegroundRefetch(() => {
    void refetch();
  });

  const filterChips = useMemo(() => {
    const chips: Array<{ key: string; label: string; onRemove: () => void }> = [];
    if (tab !== 'soins') {
      const tabLabel = NURSE_TAB_OPTIONS.find((t) => t.value === tab)?.label ?? tab;
      chips.push({
        key: 'tab',
        label: tabLabel,
        onRemove: () => setTab('soins'),
      });
    }
    if (segment !== 'tous') {
      const label = NURSE_SEGMENT_OPTIONS.find((s) => s.value === segment)?.label ?? segment;
      chips.push({ key: 'segment', label, onRemove: () => setSegment('tous') });
    }
    return chips;
  }, [segment, tab]);

  const advancedCount = (tab !== 'soins' ? 1 : 0) + (segment !== 'tous' ? 1 : 0);

  const renderItem = useCallback(
    ({ item: row, index }: { item: AppointmentListRow; index: number }) => {
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
          row={row}
          index={index}
          role={isOffer ? 'demande' : 'nurse'}
          viewerId={user?.id}
          onPress={(apt) => {
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
          }}
        />
      );
    },
    [refetch, router, segment, toast, user?.id],
  );

  const ListHeader = useCallback(
    () => (
      <View style={styles.scrollHeader}>
        <AppointmentsListFilterBar
          embedded
          followedByBookCta
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Nom, téléphone, adresse…"
          onOpenFilters={() => setSheetOpen(true)}
          advancedFilterCount={advancedCount}
          chips={filterChips}
        />
        <BookAppointmentCta href="/(nurse)/appointments/new" />
        <PlanLimitsBanner />
      </View>
    ),
    [advancedCount, filterChips, search],
  );

  const isDemandesEmpty = segment === 'en_attente';
  const emptyTitle = isDemandesEmpty ? 'Aucune demande en attente' : 'Aucun rendez-vous';
  const emptyDescription = isDemandesEmpty
    ? 'Les nouvelles propositions de soins apparaîtront ici.'
    : 'Modifiez les filtres ou créez un nouveau RDV.';

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
          <EmptyState
            title={emptyTitle}
            description={emptyDescription}
            imageSource={isDemandesEmpty ? EMPTY_DEMANDE_IMAGE : EMPTY_RDV_IMAGE}
            imageWidth={isDemandesEmpty ? EMPTY_DEMANDE_IMAGE_WIDTH : EMPTY_RDV_IMAGE_WIDTH}
            imageHeight={isDemandesEmpty ? EMPTY_DEMANDE_IMAGE_HEIGHT : EMPTY_RDV_IMAGE_HEIGHT}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  listContent: {
    paddingHorizontal: spacing[4],
    paddingTop: 0,
    paddingBottom: spacing[8],
    flexGrow: 1,
  },
  scrollHeader: {
    marginTop: 0,
    alignSelf: 'stretch',
    width: '100%',
  },
  listHeaderComponent: {
    paddingTop: 0,
    marginTop: 0,
  },
});
