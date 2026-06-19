import type { StyleProp, ViewStyle } from 'react-native';
import { OpaqueHeaderChrome } from '@/components/navigation/OpaqueHeaderChrome';
import type { LiquidGlassChromeVariant } from '@/components/navigation/nav-chrome-tokens';

interface Props {
  style?: StyleProp<ViewStyle>;
  /** @deprecated Ignoré — fond opaque blanc. */
  variant?: LiquidGlassChromeVariant;
}

/** Fond header stack — blanc opaque (verre natif réservé aux orbes). */
export function NavChromeBackground({ style }: Props) {
  return <OpaqueHeaderChrome style={style} />;
}
