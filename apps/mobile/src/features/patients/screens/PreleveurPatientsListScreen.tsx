import { Fragment, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Users } from 'lucide-react-native';
import { ageFromBirthDate } from '@oneandlab/shared-utils';
import { useScreenFabScrollClearance } from '@/components/ui/ScreenFab';
import { TabSceneScrollView } from '@/components/navigation/TabSceneScrollView';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { SkeletonPatientList } from '@/components/ui/skeletons';
import { Button } from '@/components/ui/Button';
import { AppointmentsListFilterBar } from '@/features/appointments/components/AppointmentsListFilterBar';
import { ProfileNavRow } from '@/features/profile/components/ProfileNavRow';
import { queryKeys } from '@/lib/query-keys';
import { useManualRefresh } from '@/lib/hooks/use-manual-refresh';
import { fetchAllPatients } from '../api/fetch-all-patients';
import { CreatePatientModal } from '../components/CreatePatientModal';
import {
  patientDisplayName,
  patientListSubtitle,
  patientPickerOptionFromRow,
} from '../utils/patient-contact-display';
import { iconSize, radius, spacing, AppText, useStyles, font, type Theme } from '@/theme';

interface Props {
  createOpen: boolean;
  onCreateOpenChange: (open: boolean) => void;
}

/** Patients du préleveur : créés par lui ou assignés par son laboratoire (scope API `/patients`). */
export function PreleveurPatientsListScreen({ createOpen, onCreateOpenChange: setCreateOpen }: Props) {
  const styles = useStyles(buildStyles);
  const fabClearance = useScreenFabScrollClearance();
  const router = useRouter();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');

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
    router.push(`/(preleveur)/appointments/new?patient_id=${patientId}` as never);
  };

  const headerLabel = search.trim()
    ? `${rows.length} résultat${rows.length > 1 ? 's' : ''}`
    : `${rows.length} patient${rows.length > 1 ? 's' : ''}`;

  return (
    <View style={styles.screen}>
      <TabSceneScrollView
        contentContainerStyle={styles.listContent}
        scrollPaddingOptions={{ extraBottom: fabClearance }}
        refreshing={refreshing}
        onRefresh={onRefresh}
      >
        <AppointmentsListFilterBar
          embedded
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Nom, téléphone, email…"
        />

        {patientsQ.isLoading ? (
          <SkeletonPatientList count={8} />
        ) : patientsQ.isError ? (
          <View style={styles.emptyWrap}>
            <EmptyState
              Icon={Users}
              title="Liste indisponible"
              description={
                patientsQ.error instanceof Error ? patientsQ.error.message : 'Impossible de charger vos patients.'
              }
            />
            <Button title="Réessayer" variant="outline" onPress={() => void patientsQ.refetch()} />
          </View>
        ) : rows.length === 0 ? (
          <View style={styles.emptyWrap}>
            <EmptyState
              Icon={Users}
              title={search.trim() ? 'Aucun résultat' : 'Aucun patient pour le moment'}
              description={
                search.trim()
                  ? 'Essayez un autre nom ou numéro.'
                  : 'Ajoutez un patient avec le bouton + ou demandez à votre laboratoire de vous en assigner.'
              }
            />
          </View>
        ) : (
          <View style={styles.listCard}>
            <AppText style={styles.sectionKicker}>{headerLabel}</AppText>
            {rows.map((p, index) => {
              const age = p.birth_date ? ageFromBirthDate(p.birth_date) : null;
              return (
                <Fragment key={p.id}>
                  {index > 0 ? <View style={styles.rowDivider} /> : null}
                  <ProfileNavRow
                    leading={
                      <ProfileAvatar
                        profileImageUrl={p.profile_image_url}
                        seed={p.id}
                        gender={p.gender}
                        size={iconSize['4xl']}
                      />
                    }
                    title={patientDisplayName(p)}
                    titleSuffix={age != null ? ` · ${age} ans` : undefined}
                    subtitle={patientListSubtitle(p) || 'Nouveau RDV prise de sang'}
                    onPress={() => openBooking(p.id)}
                  />
                </Fragment>
              );
            })}
          </View>
        )}
      </TabSceneScrollView>
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

function buildStyles({ colors: c, fontSize }: Theme) {
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
      paddingBottom: spacing[4],
      flexGrow: 1,
    },
    listCard: {
      width: '100%' as const,
      alignSelf: 'stretch' as const,
      backgroundColor: c.surface,
      borderRadius: radius.xl,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.cardBorder,
      overflow: 'hidden' as const,
    },
    sectionKicker: {
      ...font.semiBold,
      fontSize: fontSize.xs,
      color: c.textTertiary,
      letterSpacing: 0.6,
      textTransform: 'uppercase' as const,
      paddingHorizontal: spacing[4],
      paddingTop: spacing[3.5],
      paddingBottom: spacing[2],
    },
    rowDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.borderLight,
      marginLeft: spacing[4] + 40 + spacing[3],
    },
    emptyWrap: {
      minWidth: 0,
      flexGrow: 1,
      justifyContent: 'center' as const,
      gap: spacing[3],
      paddingVertical: spacing[6],
    },
  };
}
