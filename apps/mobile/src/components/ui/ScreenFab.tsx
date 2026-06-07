import type { AppColors } from '@/theme/colors';
import { getThemedStyles } from '@/theme/use-themed-styles';
import { colors } from '@/theme';
import { Pressable, StyleSheet, View } from 'react-native';
import { Plus, type LucideIcon } from 'lucide-react-native';
import { elevation, radius, spacing } from '@/theme';

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

function buildStyles(c: AppColors) {
  return {
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
    elevation: 20,
  },
  fab: {
    position: 'absolute',
    right: spacing[4],
    bottom: spacing[6],
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: c.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
};
}

const styles = new Proxy({} as Record<string, any>, {
  get(_target, prop: string | symbol) {
    if (typeof prop === 'string') {
      return getThemedStyles('components_ui_ScreenFab_tsx_styles', buildStyles)[prop];
    }
    return undefined;
  },
});
