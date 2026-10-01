import { Fragment, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CalendarPlus } from 'lucide-react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ageFromBirthDate } from '@oneandlab/shared-utils';
import { useScreenFabScrollClearance } from '@/components/ui/ScreenFab';
import { SceneScrollView } from '@/components/navigation/SceneScrollView';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { SkeletonPatientList } from '@/components/ui/skeletons';
import { AppointmentsListFilterBar } from '@/features/appointments/components/AppointmentsListFilterBar';
import { SettingsRow } from '@/components/ui/SettingsRow';
import { queryKeys } from '@/lib/query-keys';
import { useManualRefresh } from '@/lib/hooks/use-manual-refresh';
import { bookingNewHref } from '@/navigation/role-hrefs';
import { fetchAllPatients } from '../api/fetch-all-patients';
import { CreatePatientModal } from '../components/CreatePatientModal';
import {
  patientDisplayName,
  patientListSubtitle,
  patientPickerOptionFromRow,
} from '../utils/patient-contact-display';
import { ICON_STROKE_WIDTH, iconSize, radius, spacing, AppText, useStyles, type Theme } from '@/theme';
import { useAppColors } from '@/theme/use-app-colors';

interface Props {
  createOpen: boolean;
  onCreateOpenChange: (open: boolean) => void;
}

/** Patients du préleveur : créés par lui ou assignés par son laboratoire (scope API `/patients`). */
export function PreleveurPatientsListScreen({ createOpen, onCreateOpenChange: setCreateOpen }: Props) {
  const styles = useStyles(buildStyles);
  const c = useAppColors();
  const fabClearance = useScreenFabScrollClearance();
  const router = useRouter();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const hasQuery = search.trim().length > 0;

  const patientsQ = useQuery({
    queryKey: queryKeys.patients.list(),
    queryFn: () => fetchAllPatients(),
  });
  const { refreshing, onRefresh } = useManualRefresh(patientsQ.refetch);

  const rows = useMemo(() => {
    const all = patientsQ.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return all;
    return all.filter((p) => patientPickerOptionFromRow(p).searchText.toLowerCase().includes(q));
  }, [patientsQ.data, search]);

  const openBooking = (patientId: string) => {
    router.push(bookingNewHref('/(preleveur)', { patient_id: patientId }));
  };

  const countLabel = hasQuery
    ? `${rows.length} résultat${rows.length > 1 ? 's' : ''}`
    : `${rows.length} patient${rows.length > 1 ? 's' : ''}`;

  return (
    <View style={styles.screen}>
      <SceneScrollView
        contentContainerStyle={[styles.listContent, { paddingBottom: spacing[4] + fabClearance }]}
        refreshing={refreshing}
        onRefresh={onRefresh}
      >
        <AppointmentsListFilterBar
          embedded
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Nom, téléphone, e-mail…"
        />

        {patientsQ.isLoading ? (
          <SkeletonPatientList count={8} />
        ) : patientsQ.isError && !patientsQ.data ? (
          <View style={styles.emptyWrap}>
            <ErrorState
              title="Patients indisponibles"
              error={patientsQ.error}
              onRetry={() => void patientsQ.refetch()}
            />
          </View>
        ) : rows.length === 0 ? (
          <View style={styles.emptyWrap}>
            {hasQuery ? (
              <EmptyState illustration="search" title="Aucun résultat" description="Essayez un autre nom ou numéro." />
            ) : (
              <EmptyState
                illustration="patients"
                title="Aucun patient"
                description="Ajoutez un patient ou demandez à votre laboratoire de vous en assigner."
                actionLabel="Ajouter un patient"
                onAction={() => setCreateOpen(true)}
              />
            )}
          </View>
        ) : (
          <View style={styles.listSection}>
            <AppText variant="secondary" style={styles.count}>
              {countLabel}
            </AppText>
            <View style={styles.listCard}>
              {rows.map((p, index) => {
                const age = p.birth_date ? ageFromBirthDate(p.birth_date) : null;
                const subtitle = patientListSubtitle(p);
                return (
                  <Fragment key={p.id}>
                    {index > 0 ? <View style={styles.rowDivider} /> : null}
                    <SettingsRow
                      leading={
                        <ProfileAvatar
                          profileImageUrl={p.profile_image_url}
                          seed={p.id}
                          gender={p.gender}
                          size={iconSize['2xl']}
                        />
                      }
                      label={patientDisplayName(p)}
                      labelSuffix={age != null ? ` · ${age} ans` : undefined}
                      description={subtitle || undefined}
                      accessibilityHint="Créer un rendez-vous pour ce patient"
                      trailing={
                        <CalendarPlus size={iconSize.md} color={c.primary} strokeWidth={ICON_STROKE_WIDTH} />
                      }
                      onPress={() => openBooking(p.id)}
                    />
                  </Fragment>
                );
              })}
            </View>
          </View>
        )}
      </SceneScrollView>
      <CreatePatientModal
        visible={createOpen}
        detectDuplicates={false}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          setCreateOpen(false);
          void qc.invalidateQueries({ queryKey: queryKeys.patients.all });
        }}
      />
    </View>
  );
}

function buildStyles({ colors: c }: Theme) {
  return {
    screen: {
      minWidth: 0,
      flex: 1,
      backgroundColor: c.background,
    },
    listContent: {
      minWidth: 0,
      paddingHorizontal: spacing[4],
      paddingTop: spacing[2],
      flexGrow: 1,
    },
    listSection: {
      gap: spacing[2],
    },
    count: {
      paddingHorizontal: spacing[1],
    },
    listCard: {
      width: '100%' as const,
      alignSelf: 'stretch' as const,
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.cardBorder,
      overflow: 'hidden' as const,
    },
    rowDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.borderLight,
      marginLeft: spacing[4] + iconSize['2xl'] + spacing[3],
    },
    emptyWrap: {
      minWidth: 0,
      flexGrow: 1,
      justifyContent: 'center' as const,
      paddingVertical: spacing[6],
    },
  };
}
