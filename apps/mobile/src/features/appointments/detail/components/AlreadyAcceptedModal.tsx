import { Modal, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { colors, elevation, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

export function AlreadyAcceptedModal() {
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

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[6],
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius['2xl'],
    padding: spacing[5],
    gap: spacing[3],
    alignItems: 'center',
    width: '100%',
  },
  emoji: {
    fontSize: 56,
    lineHeight: 60,
    marginBottom: spacing[1],
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xl,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  message: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: fontSize.base * 1.55,
  },
});
