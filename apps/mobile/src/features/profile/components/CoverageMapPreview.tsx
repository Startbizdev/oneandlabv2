import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors, radius } from '@/theme';

interface Props {
  radiusKm: number;
  maxRadiusKm: number;
}

/** Aperçu visuel du rayon (sans dépendance carte native). */
export function CoverageMapPreview({ radiusKm, maxRadiusKm }: Props) {
  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.42;
  const circleR = maxR * (radiusKm / Math.max(1, maxRadiusKm));

  return (
    <View style={styles.wrap}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle cx={cx} cy={cy} r={maxR} fill={colors.primaryLight} opacity={0.35} />
        <Circle
          cx={cx}
          cy={cy}
          r={circleR}
          fill={colors.primary}
          fillOpacity={0.22}
          stroke={colors.primary}
          strokeWidth={2}
        />
        <Circle cx={cx} cy={cy} r={6} fill={colors.primary} />
        <Circle cx={cx} cy={cy} r={3} fill={colors.surface} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
});
