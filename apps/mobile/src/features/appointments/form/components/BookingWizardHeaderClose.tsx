import { Pressable, StyleSheet } from 'react-native';
import { X } from 'lucide-react-native';
import { colors } from '@/theme';

interface Props {
  onPress: () => void;
}

/** Fermer le wizard (étape 1 — sélection des soins). */
export function BookingWizardHeaderClose({ onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      style={styles.btn}
      accessibilityRole="button"
      accessibilityLabel="Fermer"
    >
      <X size={22} color={colors.primary} strokeWidth={2.25} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    marginLeft: 4,
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
