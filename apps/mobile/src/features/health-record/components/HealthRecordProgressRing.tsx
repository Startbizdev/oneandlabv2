import { useId } from 'react';
import type { AppColors } from '@/theme/colors';
import { hexToRgba } from '@/theme/color-utils';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  percent: number;
  size?: number;
  strokeWidth?: number;
  /** Texte / piste clairs sur fond dégradé. */
  tone?: 'default' | 'onGradient';
  /** Anneau compact pour listes (Plus, menus). */
  variant?: 'default' | 'mini';
}

export function HealthRecordProgressRing({
  percent,
  size,
  strokeWidth,
  tone = 'default',
  variant = 'default',
}: Props) {
  const isMini = variant === 'mini';
  const resolvedSize = size ?? (isMini ? 34 : 52);
  const resolvedStroke = strokeWidth ?? (isMini ? 3 : 5);
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'HealthRecordProgressRing');
  const onGradient = tone === 'onGradient';
  const gradientId = useId();
  const clamped = Math.min(100, Math.max(0, percent));
  const radiusPx = (resolvedSize - resolvedStroke) / 2;
  const circumference = 2 * Math.PI * radiusPx;
  const offset = circumference - (clamped / 100) * circumference;
  const trackColor = onGradient ? hexToRgba('#FFFFFF', 0.28) : c.borderLight;
  const progressStart = onGradient ? '#FFFFFF' : c.primary;
  const progressEnd = onGradient ? hexToRgba('#FFFFFF', 0.72) : (c.gradientEnd ?? c.primary);

  return (
    <View style={[styles.wrap, { width: resolvedSize, height: resolvedSize }]}>
      <Svg width={resolvedSize} height={resolvedSize}>
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={progressStart} />
            <Stop offset="1" stopColor={progressEnd} />
          </LinearGradient>
        </Defs>
        <Circle
          cx={resolvedSize / 2}
          cy={resolvedSize / 2}
          r={radiusPx}
          stroke={trackColor}
          strokeWidth={resolvedStroke}
          fill="none"
        />
        <Circle
          cx={resolvedSize / 2}
          cy={resolvedSize / 2}
          r={radiusPx}
          stroke={`url(#${gradientId})`}
          strokeWidth={resolvedStroke}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${resolvedSize / 2}, ${resolvedSize / 2}`}
        />
      </Svg>
      <Text
        style={[
          styles.label,
          isMini && styles.labelMini,
          resolvedSize >= 64 && styles.labelLarge,
          onGradient ? styles.labelOnGradient : styles.labelDefault,
        ]}
      >
        {clamped}%
      </Text>
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
    wrap: {
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    label: {
      position: 'absolute' as const,
      zIndex: 2,
      fontFamily: fontFamily.bold,
      fontSize: fontSize.xs,
    },
    labelMini: {
      fontSize: 9,
      letterSpacing: -0.3,
    },
    labelLarge: {
      fontSize: fontSize.sm,
      letterSpacing: -0.2,
    },
    labelDefault: {
      color: c.textPrimary,
    },
    labelOnGradient: {
      color: '#FFFFFF',
    },
  };
}
