import { View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { SheetModal } from '@/components/ui/SheetModal';
import { AppText, spacing, useStyles, font, type Theme } from '@/theme';

interface Props {
  visible: boolean;
  onResume: () => void;
  /** Efface le brouillon et repart d'un tunnel vierge. */
  onRestart: () => void;
  /** Fermeture sans choix : tunnel vierge, brouillon laissé tel quel. */
  onDismiss: () => void;
}

/** Proposé à l'ouverture du tunnel quand une réservation inachevée de moins de 24 h existe sur l'appareil. */
export function BookingDraftResumeSheet({ visible, onResume, onRestart, onDismiss }: Props) {
  const styles = useStyles(buildStyles);

  return (
    <SheetModal
      visible={visible}
      onClose={onDismiss}
      title="Reprendre votre réservation ?"
      footer={
        <View style={styles.actions}>
          <Button title="Reprendre ma réservation" variant="primary" size="lg" fullWidth onPress={onResume} />
          <Button title="Recommencer" variant="ghost" size="lg" fullWidth onPress={onRestart} />
        </View>
      }
    >
      <AppText style={styles.message}>
        Votre saisie a été conservée sur cet appareil. Les documents joints devront être ajoutés à nouveau.
      </AppText>
    </SheetModal>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    message: {
      ...font.regular,
      fontSize: fontSize.base,
      lineHeight: Math.round(fontSize.base * 1.5),
      color: c.textSecondary,
    },
    actions: {
      gap: spacing[2],
    },
  };
}
