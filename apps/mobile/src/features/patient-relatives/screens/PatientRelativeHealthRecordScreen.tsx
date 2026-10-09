import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { SkeletonList } from '@/components/ui/skeletons';
import { HealthRecordDossierScreen } from '@/features/health-record/screens/StaffHealthRecordScreen';
import { StackChromeScreen } from '@/navigation/StackChromeScreen';
import { spacing, useStyles } from '@/theme';
import { usePatientRelative } from '../hooks/use-patient-relative';

/** Carnet de santé du dossier d'un proche, ouvert par le titulaire : carnet modifiable, constantes en lecture. */
export function PatientRelativeHealthRecordScreen() {
  const styles = useStyles(buildStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const relativeQ = usePatientRelative(id);
  const relative = relativeQ.data;

  if (!relative) {
    return (
      <StackChromeScreen>
        <View style={styles.state}>
          {relativeQ.isError ? (
            <ErrorState
              error={relativeQ.error}
              title="Impossible de charger ce proche"
              onRetry={() => void relativeQ.refetch()}
            />
          ) : (
            <SkeletonList count={4} itemHeight={56} gap={spacing[2]} />
          )}
        </View>
      </StackChromeScreen>
    );
  }

  const profileId = relative.profile_id?.trim();
  if (!profileId) {
    return (
      <StackChromeScreen>
        <View style={styles.state}>
          <EmptyState illustration="error" title="Carnet pas encore disponible" />
        </View>
      </StackChromeScreen>
    );
  }

  const firstName = relative.first_name?.trim();
  return <HealthRecordDossierScreen patientId={profileId} title={firstName ? `Carnet de ${firstName}` : undefined} />;
}

function buildStyles() {
  return {
    state: { flex: 1, minWidth: 0, justifyContent: 'center' as const, padding: spacing[4] },
  };
}
