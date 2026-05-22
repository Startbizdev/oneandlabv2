import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CalendarPlus } from 'lucide-react-native';
import { isPendingIncomingOffer } from '@oneandlab/shared-utils';
import type { Appointment } from '@oneandlab/shared-types';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonGroup } from '@/components/ui/Skeleton';
import { PlanLimitsBanner } from '@/features/nurse/components/PlanLimitsBanner';
import { AppointmentListRowCard } from '@/features/appointments/components/AppointmentListRowCard';
import {
  groupAppointmentsByBatch,
  groupAppointmentsForNurseMesDemandes,
  type AppointmentListRow,
} from '@/utils/appointment-batch';
import { AppointmentsFilterSheet } from '@/features/appointments/components/AppointmentsFilterSheet';
import { AppointmentsListFilterBar } from '@/features/appointments/components/AppointmentsListFilterBar';
import { useAppointmentsList } from '@/features/appointments/hooks/use-appointments-list';
import { useOfferQueueStore } from '@/features/appointments/store/offer-queue-store';
import { useAppointmentsCacheSyncOnFocus } from '@/features/appointments/hooks/use-appointments-cache-sync';
import { useAppForegroundRefetch } from '@/lib/hooks/use-network-status';
import { useAuthStore } from '@/store/auth-store';
import { updateAppointment } from '@/features/appointments/api/appointments.service';
import { useToast } from '@/providers/ToastProvider';
import { handleApiError } from '@/lib/errors/handle-api-error';
import {
  NURSE_SEGMENT_OPTIONS,
  NURSE_TAB_OPTIONS,
  normalizeNurseSegment,
  type NurseListTab,
  type NurseSegment,
} from '@/constants/appointments-list-filters';
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
  const [draftSegment, setDraftSegment] = useState<NurseSegment>('tous');

  const apiSegment = segment === 'tous' ? undefined : normalizeNurseSegment(segment);

  const { data, isLoading, refetch, isRefetching } = useAppointmentsList({
    nurse_tab: tab,
    nurse_segment: apiSegment,
    limit: 100,
  });

  const filtered = useMemo(() => {
    const list = data ?? [];
    if (search.trim()) return list.filter((a) => matchesSearch(a, search));
    return list;
  }, [data, search]);

  const displayRows = useMemo((): AppointmentListRow[] => {
    if (tab === 'soins' && segment === 'en_attente') {
      return groupAppointmentsForNurseMesDemandes(filtered);
    }
    return groupAppointmentsByBatch(filtered);
  }, [filtered, tab, segment]);

  useAppointmentsCacheSyncOnFocus();
  useAppForegroundRefetch(() => { void refetch(); });

  const openSheet = useCallback(() => {
    setDraftSegment(segment);
    setSheetOpen(true);
  }, [segment]);

  const applyFilters = useCallback(() => {
    setSegment(draftSegment);
    setSheetOpen(false);
  }, [draftSegment]);

  const resetFilters = useCallback(() => {
    setDraftSegment('tous');
    setSegment('tous');
    setSheetOpen(false);
  }, []);

  const filterChips = useMemo(() => {
    const chips: Array<{ key: string; label: string; onRemove: () => void }> = [];
    if (segment !== 'tous') {
      const label = NURSE_SEGMENT_OPTIONS.find((s) => s.value === segment)?.label ?? segment;
      chips.push({ key: 'segment', label, onRemove: () => setSegment('tous') });
    }
    return chips;
  }, [segment]);

  const advancedCount = segment !== 'tous' ? 1 : 0;

  const handleOffer = useCallback(
    async (id: string, status: 'confirmed' | 'refused') => {
      try {
        const res = await updateAppointment(id, { status });
        if (!res.success) throw new Error(res.error ?? 'Échec');
        toast(status === 'confirmed' ? 'RDV accepté !' : 'RDV refusé', {
          type: status === 'confirmed' ? 'success' : 'info',
        });
        await refetch();
      } catch (e) {
        handleApiError(e, toast, 'offerAction');
      }
    },
    [refetch, toast],
  );

  const handleOfferBatch = useCallback(
    async (row: AppointmentListRow, status: 'confirmed' | 'refused') => {
      const apts =
        row.kind === 'batch' ? row.appointments : [row.appointment];
      let ok = 0;
      for (const apt of apts) {
        if (
          segment === 'en_attente' &&
          apt.status === 'pending' &&
          isPendingIncomingOffer(apt, user?.id)
        ) {
          const res = await updateAppointment(apt.id, { status });
          if (res.success) ok += 1;
        }
      }
      if (ok > 0) {
        toast(
          status === 'confirmed'
            ? ok > 1
              ? `Lot accepté (${ok} soins)`
              : 'RDV accepté !'
            : ok > 1
              ? `Lot refusé (${ok} soins)`
              : 'RDV refusé',
          { type: status === 'confirmed' ? 'success' : 'info' },
        );
        await refetch();
      }
    },
    [refetch, segment, toast, user?.id],
  );

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
          role="nurse"
          viewerId={user?.id}
          onPress={(apt) => {
            if (isOffer && user?.id) {
              void useOfferQueueStore.getState().openIncomingOffer(apt.id, 'nurse', user.id);
            } else {
              router.push(`/(nurse)/appointment/${apt.id}` as never);
            }
          }}
          showOfferActions={isOffer}
          onAccept={
            isOffer
              ? () =>
                  void (row.kind === 'batch'
                    ? handleOfferBatch(row, 'confirmed')
                    : handleOffer(row.appointment.id, 'confirmed'))
              : undefined
          }
          onRefuse={
            isOffer
              ? () =>
                  void (row.kind === 'batch'
                    ? handleOfferBatch(row, 'refused')
                    : handleOffer(row.appointment.id, 'refused'))
              : undefined
          }
        />
      );
    },
    [router, segment, user?.id, handleOffer, handleOfferBatch],
  );

  const ListHeader = useCallback(
    () => (
      <View style={styles.listHeader}>
        <PlanLimitsBanner />
      </View>
    ),
    [],
  );

  return (
    <View style={styles.container}>
      <AppointmentsListFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Nom, téléphone, adresse…"
        segmentTabs={NURSE_TAB_OPTIONS.map((t) => ({ value: t.value, label: t.label }))}
        segmentTab={tab}
        onSegmentTabChange={setTab}
        onOpenFilters={openSheet}
        advancedFilterCount={advancedCount}
        chips={filterChips}
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
          ListHeaderComponent={ListHeader}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <EmptyState
              title="Aucun rendez-vous"
              description="Modifiez les filtres ou créez un nouveau RDV."
              Icon={CalendarPlus}
            />
          }
        />
      )}

      <AppointmentsFilterSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Affiner la liste"
        search=""
        onSearchChange={() => {}}
        showSearch={false}
        segments={NURSE_SEGMENT_OPTIONS}
        segment={draftSegment}
        onSegmentChange={setDraftSegment}
        onApply={applyFilters}
        onReset={resetFilters}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  skeleton: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
  },
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
