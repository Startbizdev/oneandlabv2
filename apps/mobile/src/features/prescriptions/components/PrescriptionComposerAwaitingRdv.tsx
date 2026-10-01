import { View } from 'react-native';
import { radius, spacing, AppText, useStyles, type Theme } from '@/theme';

/** Place réservée au formulaire tant qu'aucun rendez-vous n'est choisi. */
export function PrescriptionComposerAwaitingRdv() {
  const styles = useStyles(buildStyles);

  return (
    <View style={styles.wrap}>
      <AppText variant="secondary" style={styles.hint}>
        Choisissez un rendez-vous pour rédiger l’ordonnance.
      </AppText>
    </View>
  );
}

function buildStyles({ colors: c }: Theme) {
  return {
    wrap: {
      paddingVertical: spacing[6],
      paddingHorizontal: spacing[4],
      borderRadius: radius.lg,
      backgroundColor: c.surfaceAlt,
    },
    hint: {
      textAlign: 'center' as const,
    },
  };
}
