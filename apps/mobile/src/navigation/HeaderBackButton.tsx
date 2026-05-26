import { Pressable, StyleSheet } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { colors } from '@/theme';

interface Props {
  onPress: () => void;
}

/** Retour header custom (remplace HeaderBackButton natif @react-navigation/elements). */
export function HeaderBackButton({ onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={styles.btn}
      accessibilityRole="button"
      accessibilityLabel="Retour"
    >
      <ChevronLeft size={24} color={colors.primary} strokeWidth={2.25} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
