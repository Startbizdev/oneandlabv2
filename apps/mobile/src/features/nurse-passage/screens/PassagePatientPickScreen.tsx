import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { UserPlus } from 'lucide-react-native';
import type { StaffHubPatientItem } from '@oneandlab/shared-types';
import { StackChromeScreen } from '@/navigation/StackChromeScreen';
import { HeaderAction } from '@/components/navigation/HeaderAction';
import { StackKeyboardScrollView } from '@/components/navigation/StackKeyboardScrollView';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { SkeletonList } from '@/components/ui/skeletons';
import { AppointmentsListFilterBar } from '@/features/appointments/components/AppointmentsListFilterBar';
import { fetchStaffPatientHubSearch } from '@/features/patients/api/staff-hub-search.service';
import { CreatePatientModal } from '@/features/patients/components/CreatePatientModal';
import { StaffPatientHubListRow } from '@/features/patients/components/StaffPatientHubListRow';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { queryKeys } from '@/lib/query-keys';
import { capitalizeFrench } from '@/utils/appointment-datetime-fr';
import { H_PADDING, spacing, AppText, useStyles } from '@/theme';

function paramString(v: string | string[] | undefined): string {
  const raw = Array.isArray(v) ? v[0] : v;
  return raw != null ? String(raw).trim() : '';
}

export function PassagePatientPickScreen() {
  const styles = useStyles(buildStyles);
  const router = useRouter();
  const params = useLocalSearchParams<{
    start_date?: string | string[];
    mode?: string | string[];
  }>();
  const startDate = paramString(params.start_date) || new Date().toISOString().slice(0, 10);
  const mode = paramString(params.mode) === 'recurring' ? 'recurring' : 'single_day';
  const context =
    mode === 'recurring'
      ? 'Passages récurrents'
      : `Passage du ${capitalizeFrench(dayjs(startDate).format('dddd D MMMM'))}`;

  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const debouncedSearch = useDebouncedValue(search);

  const hubQ = useQuery({
    queryKey: queryKeys.patients.hubSearch(debouncedSearch.trim()),
    queryFn: async () => {
      const res = await fetchStaffPatientHubSearch(debouncedSearch.trim());
      if (!res.success) throw new Error(res.error ?? 'Recherche impossible');
      return (res.data?.items ?? []).filter(
        (item): item is StaffHubPatientItem => item.kind === 'patient',
      );
    },
    staleTime: 15_000,
  });

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

  const patients = hubQ.data ?? [];

  return (
    <StackChromeScreen
      headerRight={
        <HeaderAction icon={UserPlus} accessibilityLabel="Nouveau patient" onPress={() => setCreateOpen(true)} />
      }
    >
      <StackKeyboardScrollView contentContainerStyle={styles.scroll}>
        <AppText variant="secondary" style={styles.context}>
          {context}
        </AppText>
        <AppointmentsListFilterBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Rechercher un patient"
        />

        {hubQ.isLoading ? (
          <View style={styles.list}>
            <SkeletonList count={4} itemHeight={64} gap={spacing[2]} />
          </View>
        ) : hubQ.isError && !hubQ.data ? (
          <ErrorState title="Patients indisponibles" error={hubQ.error} onRetry={() => void hubQ.refetch()} />
        ) : patients.length === 0 ? (
          <EmptyState
            illustration="patients"
            title="Aucun patient"
            description={search.trim() ? 'Modifiez votre recherche ou créez le patient.' : undefined}
            actionLabel="Nouveau patient"
            onAction={() => setCreateOpen(true)}
          />
        ) : (
          <View style={styles.list}>
            {patients.map((item) => (
              <StaffPatientHubListRow key={item.patient_id} item={item} onPress={() => goToForm(item.patient_id)} />
            ))}
          </View>
        )}
      </StackKeyboardScrollView>

      <CreatePatientModal visible={createOpen} onClose={() => setCreateOpen(false)} onCreated={onCreated} />
    </StackChromeScreen>
  );
}

function buildStyles() {
  return {
    scroll: { paddingBottom: spacing[10] },
    context: { paddingHorizontal: H_PADDING, marginBottom: spacing[2] },
    list: { paddingHorizontal: H_PADDING, gap: spacing[1] },
  };
}
