import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { GlassView, isGlassEffectAPIAvailable } from 'expo-glass-effect';
import { SymbolView } from 'expo-symbols';
import { Plus, type LucideIcon } from 'lucide-react-native';
import { LiquidGlassChrome } from '@/components/navigation/LiquidGlassChrome';
import {
  LIQUID_GLASS_CONTROL_EFFECT,
  SCREEN_FAB_DIAMETER,
} from '@/components/navigation/nav-chrome-tokens';
import { useNativeTabBarInset } from '@/navigation/use-native-tab-bar-inset';
import { elevation, radius, spacing } from '@/theme';

interface ScreenFabProps {
  onPress: () => void;
  accessibilityLabel: string;
  Icon?: LucideIcon;
}

/** Espace scroll à réserver sous le contenu quand un ScreenFab est présent. */
export function useScreenFabScrollClearance(gap = spacing[3]): number {
  return useScreenFabBottom(gap) + SCREEN_FAB_DIAMETER;
}

/** Position `bottom` du FAB au-dessus de la tab bar native flottante. */
export function useScreenFabBottom(gap = spacing[3]): number {
  return useNativeTabBarInset() + gap;
}

function useNativeGlassFab(): boolean {
  return Platform.OS === 'ios' && isGlassEffectAPIAvailable();
}

/**
 * FAB flottant — Liquid Glass iOS 26 (GlassView natif), blur glass en fallback.
 */
export function ScreenFab({ onPress, accessibilityLabel, Icon = Plus }: ScreenFabProps) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'components_ui_ScreenFab_tsx_styles');
  const bottom = useScreenFabBottom();
  const nativeGlass = useNativeGlassFab();
  const size = SCREEN_FAB_DIAMETER;

  const icon =
    Icon === Plus ? (
      <SymbolView
        name="plus"
        size={24}
        weight="semibold"
        tintColor={c.primary}
        fallback={<Plus size={24} color={c.primary} strokeWidth={2.5} />}
      />
    ) : (
      <Icon size={24} color={c.primary} strokeWidth={2.5} />
    );

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [
          styles.host,
          { bottom, width: size, height: size },
          pressed && styles.pressed,
        ]}
      >
        {nativeGlass ? (
          <GlassView
            style={[styles.glass, { width: size, height: size, borderRadius: size / 2 }]}
            glassEffectStyle={LIQUID_GLASS_CONTROL_EFFECT}
            isInteractive
          >
            {icon}
          </GlassView>
        ) : (
          <View style={[styles.fallback, { width: size, height: size, borderRadius: size / 2 }]}>
            <LiquidGlassChrome variant="tab" style={StyleSheet.absoluteFillObject} />
            <View style={styles.iconSlot}>{icon}</View>
          </View>
        )}
      </Pressable>
    </View>
  );
}

function buildStyles(_c: AppColors) {
  return {
    overlay: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 20,
      elevation: 20,
    },
    host: {
      position: 'absolute' as const,
      right: spacing[4],
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      overflow: 'visible' as const,
    },
    pressed: {
      opacity: 0.9,
      transform: [{ scale: 0.96 }],
    },
    glass: {
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      overflow: 'hidden' as const,
    },
    fallback: {
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      overflow: 'hidden' as const,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(15, 23, 42, 0.08)',
      ...elevation.sm,
    },
    iconSlot: {
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
  };
}
