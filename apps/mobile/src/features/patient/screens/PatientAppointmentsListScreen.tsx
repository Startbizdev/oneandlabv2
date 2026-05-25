import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { Appointment } from '@oneandlab/shared-types';
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
import { useStaleForegroundRefetch } from '@/lib/hooks/use-stale-foreground-refetch';
import { prefetchAppointmentsForUser } from '@/features/appointments/lib/prefetch-appointments';
import { useAuthStore } from '@/store/auth-store';
import { PATIENT_TAB_OPTIONS, type PatientListTab } from '@/constants/appointments-list-filters';
import { EMPTY_RDV_IMAGE, EMPTY_RDV_IMAGE_HEIGHT, EMPTY_RDV_IMAGE_WIDTH } from '@/constants/empty-state-images';
import { colors, spacing } from '@/theme';

function matchesSearch(apt: Appointment, q: string): boolean {
  const s = q.toLowerCase().trim();
  if (!s) return true;
  const fd = apt.form_data as Record<string, unknown> | undefined;
  const rel = (apt as Appointment & { relative?: { first_name?: string; last_name?: string } })
    .relative;
  const name = `${fd?.first_name ?? rel?.first_name ?? ''} ${fd?.last_name ?? rel?.last_name ?? ''}`.toLowerCase();
  return (
    name.includes(s) ||
    (apt.category_name ?? '').toLowerCase().includes(s) ||
    String(apt.address ?? '').toLowerCase().includes(s)
  );
}

export function PatientAppointmentsListScreen() {
  const router = useRouter();
  const userId = useAuthStore((s) => s.user?.id);
  const [tab, setTab] = useState<PatientListTab>('upcoming');
  const [search, setSearch] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);

  const listFilters = useMemo(
    () => ({
      limit: APPOINTMENTS_LIST_PAGE_SIZE,
      patient_period: tab === 'upcoming' ? ('upcoming' as const) : ('past' as const),
    }),
    [tab],
  );

  const query = useInfiniteAppointmentsList(listFilters);
  const { refetch } = query;

  const appointments = useMemo(
    () => flattenInfiniteAppointments(query.data?.pages),
    [query.data?.pages],
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return appointments;
    return appointments.filter((a) => matchesSearch(a, search));
  }, [appointments, search]);

  const displayRows = useMemo(
    () =>
      buildAppointmentDisplayRows(filtered, {
        direction: tab === 'upcoming' ? 'upcoming' : 'past',
      }),
    [filtered, tab],
  );

  useEffect(() => {
    prefetchAppointmentsForUser('patient');
  }, []);

  useStaleForegroundRefetch(() => {
    void refetch();
  }, query.dataUpdatedAt);

  const onPeriodChange = useCallback((v: PatientListTab) => {
    setTab(v);
    setSheetOpen(false);
  }, []);

  const filterChips = useMemo(() => {
    if (tab === 'upcoming') return [];
    const label = PATIENT_TAB_OPTIONS.find((t) => t.value === tab)?.label ?? tab;
    return [{ key: 'period', label, onRemove: () => setTab('upcoming') }];
  }, [tab]);

  const advancedCount = tab !== 'upcoming' ? 1 : 0;

  const renderItem = useCallback(
    ({ item: row, index }: { item: AppointmentListRow; index: number }) => (
      <AppointmentListRowCard
        row={row}
        index={index}
        role="patient"
        onPress={(apt) => router.push(`/(patient)/appointment/${apt.id}` as never)}
      />
    ),
    [router],
  );

  const ListHeader = useCallback(
    () => (
      <View style={styles.listHeader}>
        <AppointmentsBookCta href="/(patient)/booking/new" label="Prendre rendez-vous" />
      </View>
    ),
    [],
  );

  return (
    <View style={styles.container}>
      {query.isError ? (
        <View style={styles.errorWrap}>
          <EmptyState
            title="Impossible de charger vos rendez-vous"
            description={
              query.error instanceof Error
                ? query.error.message
                : 'Vérifiez votre connexion et réessayez.'
            }
            actionLabel="Réessayer"
            onAction={() => void refetch()}
          />
        </View>
      ) : (
        <InfiniteQueryFlatList
          query={query}
          items={displayRows}
          header={
            <AppointmentsListFilterBar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Soin, adresse, nom…"
              onOpenFilters={() => setSheetOpen(true)}
              advancedFilterCount={advancedCount}
              chips={filterChips}
            />
          }
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
                title={tab === 'upcoming' ? 'Aucun rendez-vous à venir' : 'Aucun rendez-vous passé'}
                description="Réservez un nouveau rendez-vous avec le bouton ci-dessus."
              />
            ) : null
          }
        />
      )}

      <AppointmentsFilterSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Filtrer les rendez-vous"
        search=""
        onSearchChange={() => {}}
        showSearch={false}
        segments={PATIENT_TAB_OPTIONS}
        segment={tab}
        onSegmentChange={onPeriodChange}
        segmentSectionLabel="Période"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  errorWrap: {
    flex: 1,
    paddingHorizontal: spacing[4],
    justifyContent: 'center',
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
