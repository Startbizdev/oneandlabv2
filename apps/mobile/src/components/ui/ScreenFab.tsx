import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { Pressable, StyleSheet, View } from 'react-native';
import { Plus, type LucideIcon } from 'lucide-react-native';
import { SCREEN_FAB_DIAMETER } from '@/components/navigation/nav-chrome-tokens';
import { elevation, spacing } from '@/theme';

interface ScreenFabProps {
  onPress: () => void;
  accessibilityLabel: string;
  Icon?: LucideIcon;
}

/** Position bas du FAB — la scène NativeTabs est déjà au-dessus de la tab bar. */
export function useScreenFabBottom(gap = spacing[6]): number {
  return gap;
}

/** Espace scroll à réserver sous le contenu quand un ScreenFab est présent. */
export function useScreenFabScrollClearance(gap = spacing[6]): number {
  return useScreenFabBottom(gap) + SCREEN_FAB_DIAMETER;
}

/**
 * FAB primaire en bas à droite.
 * Overlay absolu (sans Modal) — ne bloque pas les touches du scroll.
 */
export function ScreenFab({ onPress, accessibilityLabel, Icon = Plus }: ScreenFabProps) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'ScreenFab');
  const bottom = useScreenFabBottom();
  const size = SCREEN_FAB_DIAMETER;

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [
          styles.fab,
          {
            bottom,
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: c.primary,
          },
          pressed && styles.pressed,
        ]}
      >
        <Icon size={26} color="#FFFFFF" strokeWidth={2.5} />
      </Pressable>
    </View>
  );
}

function buildStyles(_c: AppColors) {
  return {
    overlay: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 30,
      elevation: 30,
    },
    fab: {
      position: 'absolute' as const,
      right: spacing[4],
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      ...elevation.md,
    },
    pressed: {
      opacity: 0.92,
      transform: [{ scale: 0.96 }],
    },
  };
}
