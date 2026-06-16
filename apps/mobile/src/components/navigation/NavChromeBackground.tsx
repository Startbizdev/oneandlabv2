import { Platform, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { GlassView, isGlassEffectAPIAvailable } from 'expo-glass-effect';
import { LiquidGlassChrome } from '@/components/navigation/LiquidGlassChrome';
import type { LiquidGlassChromeVariant } from '@/components/navigation/nav-chrome-tokens';

interface Props {
  style?: StyleProp<ViewStyle>;
  variant?: LiquidGlassChromeVariant;
}

/** Fond header stack — GlassView natif iOS 26, blur Liquid Glass sinon. */
export function NavChromeBackground({ style, variant = 'stack' }: Props) {
  const nativeGlass = Platform.OS === 'ios' && isGlassEffectAPIAvailable();

  if (nativeGlass) {
    return (
      <GlassView
        style={[StyleSheet.absoluteFillObject, style]}
        glassEffectStyle="clear"
      />
    );
  }

  return <LiquidGlassChrome style={style} variant={variant} />;
}
