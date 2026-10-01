import { Pressable, View } from 'react-native';
import type { Appointment } from '@oneandlab/shared-types';
import { PatientAppointmentSummaryHeader } from '@/features/appointments/detail/components/patient/PatientAppointmentSummaryHeader';
import { AppText, radius, spacing, useStyles, font, type Theme } from '@/theme';

interface Props {
  apt: Appointment;
  batchCount: number;
  onPress: () => void;
}

/** Carte « Prochaine visite » en tête de l’accueil patient. */
export function PatientNextVisitCard({ apt, batchCount, onPress }: Props) {
  const styles = useStyles(buildStyles);

  return (
    <View style={styles.section}>
      <AppText style={styles.title} accessibilityRole="header">
        Prochaine visite
      </AppText>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Voir le détail de votre prochaine visite"
        style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
      >
        <PatientAppointmentSummaryHeader apt={apt} batchCount={batchCount} />
      </Pressable>
    </View>
  );
}

function buildStyles({ colors: c, text }: Theme) {
  return {
    section: { gap: spacing[2] },
    title: {
      ...text.caption,
      ...font.semiBold,
      color: c.textSecondary,
      paddingHorizontal: spacing[1],
    },
    pressable: { borderRadius: radius.xl },
    pressed: { opacity: 0.85 },
  };
}
