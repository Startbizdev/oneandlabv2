import { useAppColors } from '@/theme/use-app-colors';
import { hexToRgba } from '@/theme/color-utils';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
  style?: StyleProp<ViewStyle>;
}

/** Fond header Cary — pleine largeur, bord bas droit (coins arrondis sur le contenu). */
export function CaryHeaderBackground({ style }: Props) {
  const c = useAppColors();

  return (
    <View style={[styles.root, style, Platform.OS === 'android' ? { backgroundColor: c.background } : null]}>
      <LinearGradient
        colors={[
          hexToRgba(c.gradientStart, 0.32),
          'rgba(255, 255, 255, 0.22)',
          hexToRgba(c.gradientEnd, 0.28),
        ]}
        locations={[0, 0.52, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {Platform.OS === 'ios' ? (
        <BlurView intensity={56} tint="light" style={StyleSheet.absoluteFill} />
      ) : null}

      <View
        style={[
          styles.frost,
          { backgroundColor: hexToRgba(c.background, Platform.OS === 'ios' ? 0.62 : 0.88) },
        ]}
        pointerEvents="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: 'hidden',
  },
  frost: {
    ...StyleSheet.absoluteFillObject,
  },
});
