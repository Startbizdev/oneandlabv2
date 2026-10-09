import { useMemo } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { appointmentDossierPatientId } from '@oneandlab/shared-utils';
import { StackChromeScreen } from '@/navigation/StackChromeScreen';
import { SceneScrollView } from '@/components/navigation/SceneScrollView';
import { ErrorState } from '@/components/ui/ErrorState';
import { SkeletonList } from '@/components/ui/skeletons';
import { useManualRefresh } from '@/lib/hooks/use-manual-refresh';
import { medicalDocumentsQueryOptions } from '@/features/appointments/detail/hooks/use-appointment-detail-extras';
import { filterListDocuments } from '@/features/appointments/detail/utils/document-labels';
import { H_PADDING, spacing, useStyles } from '@/theme';
import { passageAppointmentQueryOptions } from '../hooks/passage-appointment-query';
import { PassageDetailDocumentsPanel } from '../components/PassageDetailDocumentsPanel';

/** Documents d'un passage (RDV + espace ordonnances), ouverts depuis la ligne « Documents » de sa fiche. */
export function PassageDocumentsScreen() {
  const styles = useStyles(buildStyles);
  const qc = useQueryClient();
  const params = useLocalSearchParams<{ appointment_id?: string }>();
  const appointmentId = String(params.appointment_id ?? '');

  const appointmentQ = useQuery(passageAppointmentQueryOptions(appointmentId));
  const docsOptions = medicalDocumentsQueryOptions(appointmentId);
  const docsQ = useQuery(docsOptions);
  const apt = appointmentQ.data;

  const docs = useMemo(
    () => filterListDocuments(docsQ.data ?? [], { omitCarePhotos: true }),
    [docsQ.data],
  );

  const pullRefresh = useManualRefresh(() => Promise.all([appointmentQ.refetch(), docsQ.refetch()]));

  if (!appointmentId || (appointmentQ.isError && !apt)) {
    return (
      <StackChromeScreen>
        <ErrorState
          title="Passage indisponible"
          error={appointmentQ.error}
          onRetry={appointmentId ? () => void appointmentQ.refetch() : undefined}
        />
      </StackChromeScreen>
    );
  }

  if (!apt) {
    return (
      <StackChromeScreen>
        <View style={styles.loading}>
          <SkeletonList count={5} itemHeight={72} gap={spacing[2]} />
        </View>
      </StackChromeScreen>
    );
  }

  return (
    <StackChromeScreen>
      <SceneScrollView
        contentContainerStyle={styles.content}
        refreshing={pullRefresh.refreshing}
        onRefresh={pullRefresh.onRefresh}
      >
        {docsQ.isError && !docsQ.data ? (
          <ErrorState
            title="Documents indisponibles"
            error={docsQ.error}
            onRetry={() => void docsQ.refetch()}
          />
        ) : (
          <PassageDetailDocumentsPanel
            patientId={appointmentDossierPatientId(apt) ?? ''}
            appointmentId={appointmentId}
            apt={apt}
            docs={docs}
            docsLoading={docsQ.isLoading}
            onDocumentsChanged={async () => {
              await qc.invalidateQueries({ queryKey: docsOptions.queryKey });
            }}
          />
        )}
      </SceneScrollView>
    </StackChromeScreen>
  );
}

function buildStyles() {
  return {
    content: { paddingTop: spacing[2], paddingBottom: spacing[10] },
    loading: { paddingHorizontal: H_PADDING, paddingTop: spacing[4] },
  };
}
