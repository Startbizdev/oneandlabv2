import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, View, type ListRenderItem } from 'react-native';
import type { StaffHubPatientItem } from '@oneandlab/shared-types';
import { useLocalSearchParams, useRouter } from 'expo-router';
import dayjs from 'dayjs';
import { UserPlus } from 'lucide-react-native';
import { StackChromeScreen } from '@/navigation/StackChromeScreen';
import { HeaderAction } from '@/components/navigation/HeaderAction';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { SkeletonList } from '@/components/ui/skeletons';
import { AppointmentsListFilterBar } from '@/features/appointments/components/AppointmentsListFilterBar';
import { CreatePatientModal } from '@/features/patients/components/CreatePatientModal';
import { StaffPatientHubListRow } from '@/features/patients/components/StaffPatientHubListRow';
import { useInfiniteStaffHubSearch } from '@/features/patients/hooks/use-infinite-staff-hub-search';
import { useAppColors } from '@/theme/use-app-colors';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { capitalizeFrench } from '@/utils/appointment-datetime-fr';
import { H_PADDING, spacing, AppText, useStyles } from '@/theme';

function paramString(v: string | string[] | undefined): string {
  const raw = Array.isArray(v) ? v[0] : v;
  return raw != null ? String(raw).trim() : '';
}

export function PassagePatientPickScreen() {
  const styles = useStyles(buildStyles);
  const c = useAppColors();
  const router = useRouter();
  const params = useLocalSearchParams<{
    start_date?: string | string[];
    mode?: string | string[];
  }>();
  const startDate = paramString(params.start_date) || dayjs().format('YYYY-MM-DD');
  const mode = paramString(params.mode) === 'recurring' ? 'recurring' : 'single_day';
  const context =
    mode === 'recurring'
      ? 'Passages récurrents'
      : `Passage du ${capitalizeFrench(dayjs(startDate).format('dddd D MMMM'))}`;

  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const debouncedSearch = useDebouncedValue(search);

  const { query: hubQ, items } = useInfiniteStaffHubSearch(debouncedSearch);
  const patients = useMemo(
    () => items.filter((item): item is StaffHubPatientItem => item.kind === 'patient'),
    [items],
  );
  const { fetchNextPage, hasNextPage, isFetchingNextPage, isFetchNextPageError } = hubQ;
  const canLoadMore = Boolean(hasNextPage) && !isFetchingNextPage && !isFetchNextPageError;
  const loadMore = useCallback(() => {
    if (canLoadMore) void fetchNextPage();
  }, [canLoadMore, fetchNextPage]);

  /** La recherche mélange patients, documents et échanges : on complète tant que l'écran n'est pas rempli. */
  useEffect(() => {
    if (hubQ.data && patients.length < 20) loadMore();
  }, [hubQ.data, patients.length, loadMore]);

  const goToForm = useCallback(
    (patientId: string) => {
      router.push({
        pathname: '/(nurse)/passage/new',
        params: { patient_id: patientId, start_date: startDate, mode },
      });
    },
    [mode, router, startDate],
  );

  const onCreated = useCallback(
    (patient: { id: string }) => {
      setCreateOpen(false);
      goToForm(patient.id);
    },
    [goToForm],
  );

  const renderItem: ListRenderItem<StaffHubPatientItem> = useCallback(
    ({ item }) => (
      <View style={styles.row}>
        <StaffPatientHubListRow item={item} onPress={() => goToForm(item.patient_id)} />
      </View>
    ),
    [goToForm, styles.row],
  );

  return (
    <StackChromeScreen
      headerRight={
        <HeaderAction icon={UserPlus} accessibilityLabel="Nouveau patient" onPress={() => setCreateOpen(true)} />
      }
    >
      <FlatList
        style={styles.fill}
        data={hubQ.isLoading || (hubQ.isError && !hubQ.data) ? [] : patients}
        keyExtractor={(item) => item.patient_id}
        renderItem={renderItem}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.scroll}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={
          <>
            <AppText variant="secondary" style={styles.context}>
              {context}
            </AppText>
            <AppointmentsListFilterBar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Rechercher un patient"
            />
          </>
        }
        ListEmptyComponent={
          hubQ.isLoading ? (
            <View style={styles.list}>
              <SkeletonList count={4} itemHeight={64} gap={spacing[2]} />
            </View>
          ) : hubQ.isError && !hubQ.data ? (
            <ErrorState title="Patients indisponibles" error={hubQ.error} onRetry={() => void hubQ.refetch()} />
          ) : hasNextPage ? null : (
            <EmptyState
              illustration="patients"
              title="Aucun patient"
              description={search.trim() ? 'Modifiez votre recherche ou créez le patient.' : undefined}
              actionLabel="Nouveau patient"
              onAction={() => setCreateOpen(true)}
            />
          )
        }
        ListFooterComponent={
          isFetchingNextPage ? <ActivityIndicator style={styles.footerLoader} color={c.primary} /> : null
        }
      />

      <CreatePatientModal
        visible={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={onCreated}
        onExistingPatient={onCreated}
      />
    </StackChromeScreen>
  );
}

function buildStyles() {
  return {
    fill: { minWidth: 0, flex: 1 },
    scroll: { paddingBottom: spacing[10], gap: spacing[1] },
    context: { paddingHorizontal: H_PADDING, marginBottom: spacing[2] },
    list: { paddingHorizontal: H_PADDING, gap: spacing[1] },
    footerLoader: { paddingVertical: spacing[4] },
    row: { paddingHorizontal: H_PADDING },
  };
}
