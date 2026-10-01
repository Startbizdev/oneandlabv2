import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useStyles, type Theme } from '@/theme';

type Props = {
  style?: StyleProp<ViewStyle>;
};

/**
 * Fond header opaque blanc — iOS 26.
 * Ne pas utiliser GlassView pleine largeur sur fond uniforme : le matériau Liquid Glass
 * assombrit/grise le contenu (expo/expo#42224, doc expo-glass-effect).
 * Le verre natif reste réservé aux orbes (`GlassHeaderButton`).
 */
export function OpaqueHeaderChrome({ style }: Props) {
  const styles = useStyles(buildStyles);
  return <View pointerEvents="none" style={[styles.root, style]} />;
}

function buildStyles({ colors: c }: Theme) {
  return {
    root: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: c.surface,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.cardBorder,
    },
  };
}
