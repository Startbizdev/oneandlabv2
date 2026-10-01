import { Pressable, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import type { Appointment } from '@oneandlab/shared-types';
import { Row } from '@/components/layout/primitives';
import { PatientAppointmentSummaryHeader } from '@/features/appointments/detail/components/patient/PatientAppointmentSummaryHeader';
import { useAppColors } from '@/theme/use-app-colors';
import { AppText, iconSize, radius, spacing, useStyles, font, type Theme } from '@/theme';

interface Props {
  apt: Appointment;
  batchCount: number;
  onPress: () => void;
}

/** Carte « Prochaine visite » en tête de l’accueil patient. */
export function PatientNextVisitCard({ apt, batchCount, onPress }: Props) {
  const c = useAppColors();
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
        <Row gap={spacing[1]} align="center" justify="end" style={styles.more}>
          <AppText style={styles.moreText}>Voir le détail</AppText>
          <ChevronRight size={iconSize.sm} color={c.textLink} strokeWidth={2.25} />
        </Row>
      </Pressable>
    </View>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    section: { gap: spacing[2] },
    title: {
      ...font.semiBold,
      fontSize: fontSize.sm,
      color: c.textSecondary,
      paddingHorizontal: spacing[1],
    },
    pressable: { borderRadius: radius.xl },
    pressed: { opacity: 0.85 },
    more: { paddingTop: spacing[2], paddingHorizontal: spacing[1], minHeight: 32 },
    moreText: { ...font.semiBold, fontSize: fontSize.sm, color: c.textLink },
  };
}
