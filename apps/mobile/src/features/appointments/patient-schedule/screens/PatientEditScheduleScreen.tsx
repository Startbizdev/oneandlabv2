import { ActivityIndicator, View } from 'react-native';
import { useRouter } from 'expo-router';
import { FormScreen } from '@/components/layout/FormScreen';
import { AppointmentDetailLoadError } from '@/features/appointments/detail/components/AppointmentDetailLoadError';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { FormScheduleSection } from '@/features/appointments/form/components/FormScheduleSection';
import { usePatientEditSchedule } from '@/features/appointments/patient-schedule/hooks/usePatientEditSchedule';
import { StackChromeScreen } from '@/navigation/StackChromeScreen';
import { useSceneBottomInset } from '@/navigation/use-scene-bottom-inset';
import { spacing, useStyles } from '@/theme';

const TITLE = 'Modifier le créneau';

interface Props {
  appointmentId: string;
}

export function PatientEditScheduleScreen({ appointmentId }: Props) {
  const styles = useStyles(buildStyles);
  const router = useRouter();
  const r = usePatientEditSchedule(appointmentId);
  const { footerPadding } = useSceneBottomInset();

  if (r.loadError) {
    return (
      <StackChromeScreen title={TITLE}>
        <AppointmentDetailLoadError
          error={r.loadError}
          onRetry={() => void r.retryLoad()}
          onBack={() => router.back()}
        />
      </StackChromeScreen>
    );
  }

  if (r.loading || !r.apt) {
    return (
      <StackChromeScreen title={TITLE}>
        <View style={styles.loading}>
          <ActivityIndicator />
        </View>
      </StackChromeScreen>
    );
  }

  if (String(r.apt.status ?? '').toLowerCase() !== 'pending') {
    return (
      <StackChromeScreen title={TITLE}>
        <EmptyState
          illustration="calendar"
          title="Créneau non modifiable"
          description="Seuls les rendez-vous en attente de validation peuvent être déplacés."
          actionLabel="Retour"
          onAction={() => router.back()}
        />
      </StackChromeScreen>
    );
  }

  return (
    <StackChromeScreen title={TITLE}>
      <FormScreen
        contentContainerStyle={styles.content}
        footer={
          <View style={[styles.footer, { paddingBottom: footerPadding }]}>
            <Button
              title="Enregistrer"
              onPress={r.save}
              loading={r.saving}
              disabled={!r.canSubmit}
              fullWidth
              size="lg"
            />
          </View>
        }
      >
        <FormScheduleSection
          scheduledAt={r.scheduledAt}
          serviceType={r.apt.type}
          availabilityType={r.availabilityType}
          range={r.range}
          onScheduledAt={r.setScheduledAt}
          onAvailabilityType={r.setAvailabilityType}
          onRange={r.setRange}
        />
      </FormScreen>
    </StackChromeScreen>
  );
}

function buildStyles() {
  return {
    content: { paddingHorizontal: spacing[4], paddingTop: spacing[2], gap: spacing[4] },
    loading: { flex: 1, minWidth: 0, alignItems: 'center' as const, justifyContent: 'center' as const },
    footer: { paddingHorizontal: spacing[4] },
  };
}
