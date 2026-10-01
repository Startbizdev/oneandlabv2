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

/** Carnet de santé d'un patient, vu par l'infirmier ou le pro. */
export function StaffHealthRecordScreen() {
  const styles = useStyles(buildStyles);
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const patientId = typeof id === 'string' ? id : '';

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
      <StackChromeScreen>
        <View style={styles.empty}>
          <EmptyState illustration="error" title="Patient introuvable" />
        </View>
      </StackChromeScreen>
    );
  }

  return (
    <StackChromeScreen>
      <SceneScrollView contentContainerStyle={styles.content} refreshing={refreshing} onRefresh={onRefresh}>
        <PassageFormHealthRecordPanel patientId={patientId} variant="screen" />
      </SceneScrollView>
    </StackChromeScreen>
  );
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
