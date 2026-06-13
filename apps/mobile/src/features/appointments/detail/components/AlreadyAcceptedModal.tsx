import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { elevation, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

export function AlreadyAcceptedModal() {
  const styles = useThemedStyles(buildStyles, 'features_appointments_detail_components_AlreadyAcceptedModal_tsx_AlreadyAcceptedModal_styles');

  const router = useRouter();
  return (
    <Modal transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={[styles.card, elevation.lg]}>
          <Text style={styles.emoji} accessibilityRole="image">
            😔
          </Text>
          <Text style={styles.title}>Déjà accepté</Text>
          <Text style={styles.message}>
            Ce rendez-vous a déjà été accepté par un autre préleveur.
          </Text>
          <Button title="OK" onPress={() => router.back()} fullWidth size="lg" />
        </View>
      </View>
    </Modal>
  );
}

function buildStyles(c: AppColors) {
  return {
  backdrop: {
    minWidth: 0,
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
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
    fontSize: 56,
    lineHeight: 60,
    marginBottom: spacing[1],
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xl,
    color: c.textPrimary,
    textAlign: 'center' as const,
  },
  message: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
    color: c.textSecondary,
    textAlign: 'center' as const,
    lineHeight: fontSize.base * 1.55,
  },
};
}
