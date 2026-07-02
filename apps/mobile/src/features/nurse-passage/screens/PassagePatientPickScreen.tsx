import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { hexToRgba } from '@/theme/color-utils';
import type { StaffHubPatientItem, StaffHubSearchItem } from '@oneandlab/shared-types';
import { Button } from '@/components/ui/Button';
import { StackChromeScreen } from '@/navigation/StackChromeScreen';
import { StackKeyboardScrollView } from '@/components/navigation/StackKeyboardScrollView';
import { AppointmentsListFilterBar } from '@/features/appointments/components/AppointmentsListFilterBar';
import { fetchStaffPatientHubSearch } from '@/features/patients/api/staff-hub-search.service';
import { CreatePatientModal } from '@/features/patients/components/CreatePatientModal';
import { StaffPatientHubListRow } from '@/features/patients/components/StaffPatientHubListRow';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { queryKeys } from '@/lib/query-keys';
import { H_PADDING, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';
import { EmptyState } from '@/components/ui/EmptyState';
import { Users } from 'lucide-react-native';

function paramString(v: string | string[] | undefined): string {
  const raw = Array.isArray(v) ? v[0] : v;
  return raw != null ? String(raw).trim() : '';
}

export function PassagePatientPickScreen() {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles);
  const router = useRouter();
  const params = useLocalSearchParams<{
    start_date?: string | string[];
    mode?: string | string[];
  }>();
  const startDate = paramString(params.start_date) || new Date().toISOString().slice(0, 10);
  const mode = paramString(params.mode) === 'recurring' ? 'recurring' : 'single_day';
  const isRecurring = mode === 'recurring';

  const modeHint = useMemo(() => {
    const dateLabel = dayjs(startDate).format('dddd D MMMM');
    return isRecurring
      ? 'Planification récurrente — modifiable à l’étape suivante'
      : `Passage prévu le ${dateLabel} — tout est modifiable à l’étape suivante`;
  }, [isRecurring, startDate]);

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
      ) as StaffHubSearchItem[];
    },
    staleTime: 15_000,
  });

  const goToForm = useCallback(
    (patientId: string) => {
      router.push({
        pathname: '/(nurse)/passage/new',
        params: { patient_id: patientId, start_date: startDate, mode },
      } as never);
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

  return (
    <StackChromeScreen title="Choisir un patient">
      <StackKeyboardScrollView contentContainerStyle={styles.scroll}>
        <View
          style={[
            styles.modeBanner,
            {
              backgroundColor: isRecurring ? hexToRgba(c.primary, 0.08) : c.surfaceAlt,
              borderColor: isRecurring ? c.primary : c.border,
            },
          ]}
        >
          <Text style={[styles.modeBannerText, { color: isRecurring ? c.primaryDark : c.textSecondary }]}>
            {modeHint}
          </Text>
        </View>
        <AppointmentsListFilterBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Rechercher un patient…"
        />
        <View style={styles.createRow}>
          <Button title="Nouveau patient" variant="secondary" onPress={() => setCreateOpen(true)} />
        </View>

        {hubQ.isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={c.primary} />
          </View>
        ) : (hubQ.data?.length ?? 0) === 0 ? (
          <EmptyState
            Icon={Users}
            title="Aucun patient"
            description="Créez un patient ou modifiez votre recherche."
            actionLabel="Nouveau patient"
            onAction={() => setCreateOpen(true)}
          />
        ) : (
          <View style={styles.list}>
            <Text style={[styles.hint, { color: c.textTertiary }]}>
              Sélectionnez le patient pour ce passage
            </Text>
            {hubQ.data?.map((item) =>
              item.kind === 'patient' ? (
                <StaffPatientHubListRow
                  key={item.patient_id}
                  item={item}
                  onPress={() => goToForm(item.patient_id)}
                />
              ) : null,
            )}
          </View>
        )}
      </StackKeyboardScrollView>

      <CreatePatientModal
        visible={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={onCreated}
      />
    </StackChromeScreen>
  );
}

function buildStyles(_c: AppColors) {
  return {
    scroll: { paddingBottom: spacing[10] },
    modeBanner: {
      marginHorizontal: H_PADDING,
      marginBottom: spacing[3],
      borderWidth: 1,
      borderRadius: radius.lg,
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[2.5],
    },
    modeBannerText: {
      fontFamily: fontFamily.medium,
      fontSize: fontSize.sm,
      lineHeight: fontSize.sm * 1.4,
    },
    centered: { paddingVertical: spacing[10], alignItems: 'center' as const },
    createRow: { paddingHorizontal: H_PADDING, marginBottom: spacing[3] },
    list: { paddingHorizontal: H_PADDING, gap: spacing[1] },
    hint: {
      fontFamily: fontFamily.medium,
      fontSize: fontSize.sm,
      marginBottom: spacing[2],
      paddingHorizontal: H_PADDING,
    },
  };
}
