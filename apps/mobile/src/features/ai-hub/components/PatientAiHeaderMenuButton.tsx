import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Plus } from 'lucide-react-native';

const BTN_SIZE = 44;
const ICON_SIZE = 22;

interface Props {
  onPress: () => void;
}

/** Bouton « + » header Cary — ouvre l’historique des conversations. */
export function PatientAiHeaderMenuButton({ onPress }: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles);

  return (
    <Pressable
      onPress={onPress}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel="Conversations Cary"
      style={({ pressed }) => [styles.host, pressed && styles.pressed]}
    >
      <View style={[styles.circle, { backgroundColor: c.surface }]}>
        <Plus size={ICON_SIZE} color={c.primary} strokeWidth={2.5} />
      </View>
    </Pressable>
  );
}

function buildStyles(_c: AppColors) {
  return StyleSheet.create({
    host: {
      width: BTN_SIZE + 8,
      height: BTN_SIZE + 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pressed: {
      opacity: 0.9,
      transform: [{ scale: 0.96 }],
    },
    circle: {
      width: BTN_SIZE,
      height: BTN_SIZE,
      borderRadius: BTN_SIZE / 2,
      alignItems: 'center',
      justifyContent: 'center',
      ...Platform.select({
        ios: {
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.14,
          shadowRadius: 8,
        },
        android: { elevation: 4 },
      }),
    },
  });
}
