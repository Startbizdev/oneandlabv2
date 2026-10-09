import { useCallback } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { SceneScrollView } from '@/components/navigation/SceneScrollView';
import { EmptyState } from '@/components/ui/EmptyState';
import { StackChromeScreen } from '@/navigation/StackChromeScreen';
import { useManualRefresh } from '@/lib/hooks/use-manual-refresh';
import { clinicalVitalsQueryKey } from '@/features/health-record/api/clinical-vitals.service';
import { healthRecordQueryKeys } from '@/features/health-record/hooks/use-health-record-completion';
import { PassageFormHealthRecordPanel } from '@/features/nurse-passage/components/PassageFormHealthRecordPanel';
import { spacing, useStyles } from '@/theme';

type DossierProps = {
  patientId: string;
  title?: string;
};

/** Carnet de santé plein écran d'un dossier patient : soignant, ou titulaire sur le dossier d'un proche. */
export function HealthRecordDossierScreen({ patientId, title }: DossierProps) {
  const styles = useStyles(buildStyles);
  const qc = useQueryClient();

  const refetchRecord = useCallback(
    () =>
      Promise.all([
        qc.refetchQueries({ queryKey: healthRecordQueryKeys.staffRecap(patientId) }),
        qc.refetchQueries({ queryKey: clinicalVitalsQueryKey(patientId) }),
      ]),
    [qc, patientId],
  );
  const { refreshing, onRefresh } = useManualRefresh(refetchRecord);

  if (!patientId) {
    return (
      <StackChromeScreen title={title}>
        <View style={styles.empty}>
          <EmptyState illustration="error" title="Patient introuvable" />
        </View>
      </StackChromeScreen>
    );
  }

  return (
    <StackChromeScreen title={title}>
      <SceneScrollView contentContainerStyle={styles.content} refreshing={refreshing} onRefresh={onRefresh}>
        <PassageFormHealthRecordPanel patientId={patientId} variant="screen" />
      </SceneScrollView>
    </StackChromeScreen>
  );
}

/** Carnet de santé d'un patient, vu par l'infirmier ou le pro. */
export function StaffHealthRecordScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <HealthRecordDossierScreen patientId={typeof id === 'string' ? id : ''} />;
}

function buildStyles() {
  return {
    content: {
      paddingTop: spacing[3],
      paddingHorizontal: spacing[4],
    },
    empty: {
      flex: 1,
      minWidth: 0,
      justifyContent: 'center' as const,
      paddingHorizontal: spacing[4],
    },
  };
}
