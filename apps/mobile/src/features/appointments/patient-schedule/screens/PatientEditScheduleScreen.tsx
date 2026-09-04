import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { ActivityIndicator, View } from 'react-native';
import { FormScreen } from '@/components/layout/FormScreen';
import { Button } from '@/components/ui/Button';
import { FormScheduleSection } from '@/features/appointments/form/components/FormScheduleSection';
import { usePatientEditSchedule } from '@/features/appointments/patient-schedule/hooks/usePatientEditSchedule';
import { StackChromeScreen } from '@/navigation/StackChromeScreen';
import { useStackScrollConfig } from '@/navigation/use-stack-scroll-config';
import { spreadTabSceneScrollProps } from '@/components/navigation/liquid-glass-header-inset';
import { spacing, AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  appointmentId: string;
}

export function PatientEditScheduleScreen({ appointmentId }: Props) {
  const styles = useThemedStyles(buildStyles, 'PatientEditScheduleScreen');
  const r = usePatientEditSchedule(appointmentId);
  const scrollConfig = useStackScrollConfig(styles.content);

  if (r.loading || !r.apt) {
    return (
      <StackChromeScreen title="Modifier le créneau">
        <View style={styles.loading}>
          <ActivityIndicator />
        </View>
      </StackChromeScreen>
    );
  }

  if (String(r.apt.status ?? '').toLowerCase() !== 'pending') {
    return (
      <StackChromeScreen title="Modifier le créneau">
        <View style={styles.blocked}>
          <AppText style={styles.blockedText}>
            Ce rendez-vous n’est plus modifiable. Seuls les rendez-vous en attente de validation peuvent être
            déplacés.
          </AppText>
        </View>
      </StackChromeScreen>
    );
  }

  return (
    <StackChromeScreen title="Modifier date et créneau">
      <FormScreen
        contentContainerStyle={scrollConfig.contentContainerStyle}
        {...spreadTabSceneScrollProps(scrollConfig)}
        footer={
          <View style={styles.footer}>
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
        <AppText style={styles.lead}>
          Choisissez une nouvelle date et un créneau. La modification sera visible pour le laboratoire et
          l’infirmier dès validation.
        </AppText>
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

function buildStyles(c: AppColors) {
  return {
    content: { paddingHorizontal: spacing[4], paddingTop: spacing[2], gap: spacing[4] },
    loading: { flex: 1, alignItems: 'center' as const, justifyContent: 'center' as const },
    blocked: { flex: 1, padding: spacing[4] },
    blockedText: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.sm,
      color: c.textSecondary,
      lineHeight: fontSize.sm * 1.45,
    },
    lead: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.sm,
      color: c.textSecondary,
      lineHeight: fontSize.sm * 1.45,
    },
    footer: { paddingHorizontal: spacing[4], paddingBottom: spacing[2] },
  };
}
