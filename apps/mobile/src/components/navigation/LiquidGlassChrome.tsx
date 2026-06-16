import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { hexToRgba } from '@/theme/color-utils';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import {
  LIQUID_GLASS_BLUR_INTENSITY,
  LIQUID_GLASS_FROST_OPACITY,
  LIQUID_GLASS_SPECULAR_MID,
  LIQUID_GLASS_SPECULAR_TOP,
  type LiquidGlassChromeVariant,
} from '@/components/navigation/nav-chrome-tokens';

type Props = {
  style?: StyleProp<ViewStyle>;
  variant?: LiquidGlassChromeVariant;
};

/**
 * Matériau Liquid Glass — blur natif, voile minimal, reflet haut.
 * Pas de gradient brand lourd ni bordure : la vitre laisse voir le contenu.
 */
export function LiquidGlassChrome({ style, variant = 'tab' }: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'LiquidGlassChrome');
  const blurIntensity = LIQUID_GLASS_BLUR_INTENSITY[variant] ?? 42;
  const frost = LIQUID_GLASS_FROST_OPACITY[variant] ?? 0.1;

  return (
    <View
      style={[
        styles.root,
        style,
        Platform.OS === 'android' ? { backgroundColor: hexToRgba(c.surface, 0.72) } : null,
      ]}
      pointerEvents="none"
    >
      {Platform.OS === 'ios' ? (
        <BlurView intensity={blurIntensity} tint="systemChromeMaterialLight" style={StyleSheet.absoluteFill} />
      ) : (
        <BlurView
          intensity={blurIntensity}
          tint="light"
          experimentalBlurMethod="dimezisBlurView"
          style={StyleSheet.absoluteFill}
        />
      )}

      <LinearGradient
        colors={[LIQUID_GLASS_SPECULAR_TOP, LIQUID_GLASS_SPECULAR_MID, 'transparent']}
        locations={[0, 0.35, 1]}
        style={styles.specular}
      />

      <View style={[styles.frost, { backgroundColor: hexToRgba(c.surface, frost) }]} />
    </View>
  );
}

function buildStyles(_c: AppColors) {
  return {
    root: {
      ...StyleSheet.absoluteFillObject,
      overflow: 'hidden' as const,
    },
    specular: {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      height: '55%' as const,
    },
    frost: {
      ...StyleSheet.absoluteFillObject,
    },
  };
}
