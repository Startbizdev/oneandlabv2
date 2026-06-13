import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
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
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'components_ui_ScreenFab_tsx_styles');
  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <Pressable
        onPress={onPress}
        style={[styles.fab, elevation.md]}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        <Icon size={22} color={c.textInverse} strokeWidth={2.5} />
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
    position: 'absolute' as const,
    right: spacing[4],
    bottom: spacing[6],
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: c.primary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
};
}

