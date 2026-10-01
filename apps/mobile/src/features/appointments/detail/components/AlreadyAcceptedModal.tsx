import { Modal, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CalendarX2 } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { useAppColors } from '@/theme/use-app-colors';
import {
  elevation,
  hexToRgba,
  ICON_STROKE_WIDTH,
  iconSize,
  palette,
  radius,
  spacing,
  AppText,
  useStyles,
  type Theme,
} from '@/theme';

export function AlreadyAcceptedModal() {
  const c = useAppColors();
  const styles = useStyles(buildStyles);

  const router = useRouter();
  return (
    <Modal transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={[styles.card, elevation.lg]}>
          <View style={styles.iconWell}>
            <CalendarX2 size={iconSize.xl} color={c.textSecondary} strokeWidth={ICON_STROKE_WIDTH} />
          </View>
          <AppText variant="headline" style={styles.centered} accessibilityRole="header">
            Déjà accepté
          </AppText>
          <AppText variant="secondary" style={styles.centered}>
            Ce rendez-vous a déjà été accepté par un autre préleveur.
          </AppText>
          <View style={styles.action}>
            <Button title="OK" onPress={() => router.back()} fullWidth size="lg" />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function buildStyles({ colors: c }: Theme) {
  return {
    backdrop: {
      minWidth: 0,
      flex: 1,
      backgroundColor: hexToRgba(palette.slate[900], 0.45),
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      padding: spacing[6],
    },
    card: {
      backgroundColor: c.surface,
      borderRadius: radius['2xl'],
      padding: spacing[6],
      gap: spacing[3],
      alignItems: 'center' as const,
      width: '100%' as const,
    },
    iconWell: {
      width: 64,
      height: 64,
      borderRadius: radius.full,
      backgroundColor: c.surfaceAlt,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      marginBottom: spacing[1],
    },
    centered: {
      textAlign: 'center' as const,
    },
    action: {
      alignSelf: 'stretch' as const,
      marginTop: spacing[2],
    },
  };
}
