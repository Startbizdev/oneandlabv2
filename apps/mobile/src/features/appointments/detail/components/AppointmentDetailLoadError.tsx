import { View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { spacing, useStyles, type Theme } from '@/theme';

interface Props {
  error: unknown;
  onRetry: () => void;
  onBack: () => void;
}

/** Fiche RDV impossible à charger : réessayer ou revenir en arrière (jamais un squelette sans fin). */
export function AppointmentDetailLoadError({ error, onRetry, onBack }: Props) {
  const styles = useStyles(buildStyles);
  return (
    <View style={styles.wrap}>
      <ErrorState
        error={error}
        title="Impossible d’ouvrir ce rendez-vous"
        onRetry={onRetry}
      />
      <View style={styles.back}>
        <Button title="Retour" variant="ghost" onPress={onBack} />
      </View>
    </View>
  );
}

function buildStyles({ colors: c }: Theme) {
  return {
    wrap: {
      minWidth: 0,
      flex: 1,
      backgroundColor: c.background,
      justifyContent: 'center' as const,
      paddingHorizontal: spacing[4],
    },
    back: {
      alignItems: 'center' as const,
    },
  };
}
