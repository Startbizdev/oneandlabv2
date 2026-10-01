import { iconSize, useStyles, type Theme } from '@/theme';
import { useAppColors } from '@/theme/use-app-colors';
import { Pressable, StyleSheet } from 'react-native';
import { X } from 'lucide-react-native';

interface Props {
  onPress: () => void;
}

/** Fermer le wizard (étape 1 — sélection des soins). */
export function BookingWizardHeaderClose({ onPress }: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);

  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      style={styles.btn}
      accessibilityRole="button"
      accessibilityLabel="Fermer"
    >
      <X size={iconSize.mdLg} color={c.primary} strokeWidth={2.25} />
    </Pressable>
  );
}

function buildStyles({ colors: c }: Theme) {
  return {
  btn: {
    marginLeft: 4,
    padding: 6,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
};
}
