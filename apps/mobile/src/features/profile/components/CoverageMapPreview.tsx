import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { radius } from '@/theme';

interface Props {
  radiusKm: number;
  maxRadiusKm: number;
}

/** Aperçu visuel du rayon (sans dépendance carte native). */
export function CoverageMapPreview({ radiusKm, maxRadiusKm }: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'features_profile_components_CoverageMapPreview_tsx_CoverageMapPreview_styles');

  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.42;
  const circleR = maxR * (radiusKm / Math.max(1, maxRadiusKm));

  return (
    <View style={styles.wrap}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle cx={cx} cy={cy} r={maxR} fill={c.primaryLight} opacity={0.35} />
        <Circle
          cx={cx}
          cy={cy}
          r={circleR}
          fill={c.primary}
          fillOpacity={0.22}
          stroke={c.primary}
          strokeWidth={2}
        />
        <Circle cx={cx} cy={cy} r={6} fill={c.primary} />
        <Circle cx={cx} cy={cy} r={3} fill={c.surface} />
      </Svg>
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
  wrap: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    minHeight: 200,
    backgroundColor: c.surfaceAlt,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.borderLight,
  },
};
}
