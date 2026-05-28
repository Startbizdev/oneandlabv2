import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/theme';

interface Props {
  style?: StyleProp<ViewStyle>;
}

/** Fond header Cary — pleine largeur, bord bas droit (coins arrondis sur le contenu). */
export function CaryHeaderBackground({ style }: Props) {
  return (
    <View style={[styles.root, style]}>
      <LinearGradient
        colors={[
          'rgba(47, 212, 194, 0.32)',
          'rgba(255, 255, 255, 0.22)',
          'rgba(22, 182, 214, 0.28)',
        ]}
        locations={[0, 0.52, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {Platform.OS === 'ios' ? (
        <BlurView intensity={56} tint="light" style={StyleSheet.absoluteFill} />
      ) : null}

      <View style={styles.frost} pointerEvents="none" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: Platform.OS === 'android' ? colors.background : 'transparent',
  },
  frost: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor:
      Platform.OS === 'ios' ? 'rgba(244, 250, 250, 0.62)' : 'rgba(244, 250, 250, 0.88)',
  },
});
