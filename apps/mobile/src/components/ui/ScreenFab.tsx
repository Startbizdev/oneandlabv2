import { Pressable, StyleSheet, View } from 'react-native';
import { Plus, type LucideIcon } from 'lucide-react-native';
import { colors, elevation, radius, spacing } from '@/theme';

interface ScreenFabProps {
  onPress: () => void;
  accessibilityLabel: string;
  Icon?: LucideIcon;
}

/**
 * FAB primaire en bas à droite.
 * Overlay plein écran (zIndex) pour rester visible au-dessus des FlashList.
 */
export function ScreenFab({ onPress, accessibilityLabel, Icon = Plus }: ScreenFabProps) {
  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <Pressable
        onPress={onPress}
        style={[styles.fab, elevation.md]}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        <Icon size={22} color={colors.textInverse} strokeWidth={2.5} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
    elevation: 20,
  },
  fab: {
    position: 'absolute',
    right: spacing[4],
    bottom: spacing[6],
    width: 52,
    height: 52,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
