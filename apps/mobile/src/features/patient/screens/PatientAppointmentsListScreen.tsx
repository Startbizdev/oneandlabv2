import { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { HeartPulse } from 'lucide-react-native';
import type { Appointment } from '@oneandlab/shared-types';
import { useTabSceneInsets } from '@/components/navigation/liquid-glass-header-inset';
import { EmptyState } from '@/components/ui/EmptyState';
import { FullWidthSegmentBar, type FullWidthSegment } from '@/components/ui/FullWidthSegmentBar';
import { InfiniteQueryFlatList } from '@/components/ui/InfiniteQueryFlatList';
import { SettingsSection } from '@/components/ui/SettingsSection';
import {
  APPOINTMENTS_RDV_SEARCH_PLACEHOLDER,
  RDV_LIST_SEARCH_EDGE,
  useRdvListChromeStyles,
} from '@/features/appointments/components/AppointmentsRdvListToolbar';
import { AppointmentsListSearchHost } from '@/features/appointments/components/AppointmentsListFilterBar';
import { AppointmentListRowCard } from '@/features/appointments/components/AppointmentListRowCard';
import { AppointmentListSectionHeader } from '@/features/appointments/components/AppointmentListSectionHeader';
import { appointmentListPrimaryApt, buildAppointmentDisplayRows } from '@/utils/appointment-list-sort';
import {
  appointmentListItemKey,
  withAppointmentDaySections,
  type AppointmentListItem,
} from '@/utils/appointment-list-sections';
import {
  flattenInfiniteAppointments,
  useInfiniteAppointmentsList,
} from '@/features/appointments/hooks/use-infinite-appointments-list';
import { APPOINTMENTS_LIST_PAGE_SIZE } from '@/constants/appointments-pagination';
import { useStaleForegroundRefetch } from '@/lib/hooks/use-stale-foreground-refetch';
import { prefetchAppointmentsForUser } from '@/features/appointments/lib/prefetch-appointments';
import type { PatientListTab } from '@/constants/appointments-list-filters';
import {
  EMPTY_RDV_IMAGE,
  EMPTY_RDV_IMAGE_HEIGHT,
  EMPTY_RDV_IMAGE_WIDTH,
} from '@/constants/empty-state-images';
import { useHealthRecordCompletion } from '@/features/health-record/hooks/use-health-record-completion';
import { useHealthRecordCompletionSyncOnFocus } from '@/features/health-record/hooks/use-health-record-completion-sync-on-focus';
import { useAppointmentsCacheSyncOnFocus } from '@/features/appointments/hooks/use-appointments-cache-sync';
import { HealthRecordProgressRing } from '@/features/health-record/components/HealthRecordProgressRing';
import { healthRecordHeroSubtitle } from '@/features/health-record/utils/health-record-display';
import { PatientNextVisitCard } from '../components/PatientNextVisitCard';
import { spacing, useStyles } from '@/theme';

const BOOKING_HREF = '/(patient)/booking/new';

const PERIOD_SEGMENTS: FullWidthSegment<PatientListTab>[] = [
  { id: 'upcoming', label: 'À venir' },
  { id: 'past', label: 'Passés' },
];

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
  const chromeStyles = useRdvListChromeStyles();
  const styles = useStyles(buildStyles);
  const sceneInsets = useTabSceneInsets();
  const [tab, setTab] = useState<PatientListTab>('upcoming');
  const [search, setSearch] = useState('');

  const listFilters = useMemo(
    () => ({
      limit: APPOINTMENTS_LIST_PAGE_SIZE,
      patient_period: tab === 'upcoming' ? ('upcoming' as const) : ('past' as const),
    }),
    [tab],
  );

  const query = useInfiniteAppointmentsList(listFilters);
  const { refetch } = query;
  const healthRecordQ = useHealthRecordCompletion();
  const completion = healthRecordQ.data;
  const healthPercent =
    tab === 'upcoming' && completion != null && completion.percent < 100 ? completion.percent : null;

  useHealthRecordCompletionSyncOnFocus(tab === 'upcoming');
  useAppointmentsCacheSyncOnFocus();

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

  const nextVisitRow = tab === 'upcoming' && !search.trim() ? (displayRows[0] ?? null) : null;

  const items = useMemo(
    () => withAppointmentDaySections(nextVisitRow ? displayRows.slice(1) : displayRows),
    [displayRows, nextVisitRow],
  );

  useEffect(() => {
    prefetchAppointmentsForUser('patient');
  }, []);

  useStaleForegroundRefetch(() => {
    void refetch();
  }, query.dataUpdatedAt);

  const openAppointment = useCallback(
    (apt: Appointment) => router.push(`/(patient)/appointment/${apt.id}` as never),
    [router],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: AppointmentListItem; index: number }) =>
      item.kind === 'section' ? (
        <AppointmentListSectionHeader label={item.label} />
      ) : (
        <AppointmentListRowCard row={item} index={index} role="patient" onPress={openAppointment} />
      ),
    [openAppointment],
  );

  const onSearchQueryChange = useCallback((value: string) => {
    setSearch(value);
  }, []);

  const listChrome = (
    <View
      style={[
        chromeStyles.listChrome,
        {
          paddingTop: sceneInsets.insetTop + RDV_LIST_SEARCH_EDGE,
          paddingBottom: RDV_LIST_SEARCH_EDGE,
        },
      ]}
    >
      <FullWidthSegmentBar segments={PERIOD_SEGMENTS} value={tab} onChange={setTab} />
      <AppointmentsListSearchHost
        embedded
        compactTop
        onQueryChange={onSearchQueryChange}
        searchPlaceholder={APPOINTMENTS_RDV_SEARCH_PLACEHOLDER}
      />
    </View>
  );

  const nextVisitApt = nextVisitRow ? appointmentListPrimaryApt(nextVisitRow) : null;
  const listHeader =
    nextVisitApt || healthPercent != null ? (
      <View style={styles.listHeader}>
        {nextVisitRow && nextVisitApt ? (
          <PatientNextVisitCard
            apt={nextVisitApt}
            batchCount={nextVisitRow.kind === 'batch' ? nextVisitRow.appointments.length : 1}
            onPress={() => openAppointment(nextVisitApt)}
          />
        ) : null}
        {healthPercent != null ? (
          <SettingsSection
            items={[
              {
                icon: HeartPulse,
                label: 'Carnet de santé',
                description: healthRecordHeroSubtitle(healthPercent),
                trailing: <HealthRecordProgressRing variant="mini" percent={healthPercent} />,
                onPress: () => router.push('/(patient)/health-record' as never),
              },
            ]}
          />
        ) : null}
      </View>
    ) : null;

  const emptyState = search.trim() ? (
    <EmptyState
      title="Aucun résultat pour cette recherche"
      description="Essayez un autre nom, soin ou adresse."
    />
  ) : tab === 'upcoming' ? (
    <EmptyState
      imageSource={EMPTY_RDV_IMAGE}
      imageWidth={EMPTY_RDV_IMAGE_WIDTH}
      imageHeight={EMPTY_RDV_IMAGE_HEIGHT}
      title="Pas encore de visite prévue"
      description="Réservez une visite à domicile : cela prend quelques minutes."
      actionLabel="Réserver une visite"
      onAction={() => router.push(BOOKING_HREF as never)}
    />
  ) : (
    <EmptyState
      imageSource={EMPTY_RDV_IMAGE}
      imageWidth={EMPTY_RDV_IMAGE_WIDTH}
      imageHeight={EMPTY_RDV_IMAGE_HEIGHT}
      title="Aucune visite passée pour le moment"
      description="Vos visites passées apparaîtront ici."
    />
  );

  return (
    <View style={chromeStyles.container} collapsable={false}>
      <InfiniteQueryFlatList
        query={query}
        items={items}
        renderItem={renderItem}
        keyExtractor={appointmentListItemKey}
        header={listChrome}
        reserveTopInsetInHeader
        ListHeaderComponent={listHeader}
        contentContainerStyle={chromeStyles.listContent}
        showsVerticalScrollIndicator={false}
        skeletonHeight={116}
        ListEmptyComponent={!query.isPending && !nextVisitRow ? emptyState : null}
      />
    </View>
  );
}

function buildStyles() {
  return {
    listHeader: {
      gap: spacing[4],
      paddingBottom: spacing[4],
    },
  };
}
