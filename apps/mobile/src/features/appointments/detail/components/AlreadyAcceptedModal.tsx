import { Modal, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { elevation, hexToRgba, palette, radius, spacing, AppText, useStyles, font, type Theme } from '@/theme';

export function AlreadyAcceptedModal() {
  const styles = useStyles(buildStyles);

  const router = useRouter();
  return (
    <Modal transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={[styles.card, elevation.lg]}>
          <AppText style={styles.emoji} accessibilityRole="image">
            😔
          </AppText>
          <AppText style={styles.title}>Déjà accepté</AppText>
          <AppText style={styles.message}>
            Ce rendez-vous a déjà été accepté par un autre préleveur.
          </AppText>
          <Button title="OK" onPress={() => router.back()} fullWidth size="lg" />
        </View>
      </View>
    </Modal>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
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
    padding: spacing[5],
    gap: spacing[3],
    alignItems: 'center' as const,
    width: '100%' as const,
  },
  emoji: {
    fontSize: fontSize['5xl'],
    lineHeight: 60,
    marginBottom: spacing[1],
  },
  title: {
    ...font.heading,
    fontSize: fontSize.xl,
    color: c.textPrimary,
    textAlign: 'center' as const,
  },
  message: {
    ...font.regular,
    fontSize: fontSize.base,
    color: c.textSecondary,
    textAlign: 'center' as const,
    lineHeight: fontSize.base * 1.55,
  },
};
}
