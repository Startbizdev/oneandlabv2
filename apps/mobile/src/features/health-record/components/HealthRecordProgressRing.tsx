import { useAppColors } from '@/theme/use-app-colors';
import { AppText, useStyles, font, type Theme } from '@/theme';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface Props {
  percent: number;
  size?: number;
  strokeWidth?: number;
  /** Anneau compact pour listes (Plus, menus). */
  variant?: 'default' | 'mini';
}

export function HealthRecordProgressRing({
  percent,
  size,
  strokeWidth,
  variant = 'default',
}: Props) {
  const isMini = variant === 'mini';
  const resolvedSize = size ?? (isMini ? 34 : 52);
  const resolvedStroke = strokeWidth ?? (isMini ? 3 : 5);
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const clamped = Math.min(100, Math.max(0, percent));
  const radiusPx = (resolvedSize - resolvedStroke) / 2;
  const circumference = 2 * Math.PI * radiusPx;
  const offset = circumference - (clamped / 100) * circumference;
  return (
    <View
      style={[styles.wrap, { width: resolvedSize, height: resolvedSize }]}
      accessible
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: clamped, text: `${clamped} %` }}
    >
      <Svg width={resolvedSize} height={resolvedSize}>
        <Circle
          cx={resolvedSize / 2}
          cy={resolvedSize / 2}
          r={radiusPx}
          stroke={c.borderLight}
          strokeWidth={resolvedStroke}
          fill="none"
        />
        <Circle
          cx={resolvedSize / 2}
          cy={resolvedSize / 2}
          r={radiusPx}
          stroke={c.primary}
          strokeWidth={resolvedStroke}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${resolvedSize / 2}, ${resolvedSize / 2}`}
        />
      </Svg>
      <AppText
        style={[
          styles.label,
          isMini && styles.labelMini,
          resolvedSize >= 64 && styles.labelLarge,
        ]}
      >
        {clamped}%
      </AppText>
    </View>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    wrap: {
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    label: {
      position: 'absolute' as const,
      zIndex: 2,
      ...font.semiBold,
      fontSize: fontSize.xs,
      fontVariant: ['tabular-nums' as const],
      color: c.textPrimary,
    },
    labelMini: {
      fontSize: fontSize['2xs'],
    },
    labelLarge: {
      fontSize: fontSize.sm,
    },
  };
}
