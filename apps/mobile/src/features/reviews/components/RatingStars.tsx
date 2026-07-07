import type { AppColors } from '@/theme/colors';
import { hexToRgba } from '@/theme/color-utils';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { Row } from '@/components/layout/primitives';
import { Star } from 'lucide-react-native';
import { fontFamily, fontSize } from '@/theme/typography';
import { spacing, AppText } from '@/theme';

const SIZE_MAP = {
  sm: 16,
  md: 24,
  lg: 36,
} as const;

const GAP_MAP = {
  sm: 2,
  md: spacing[1.5],
  lg: spacing[2],
} as const;

const TOUCH_MAP = {
  sm: 32,
  md: 40,
  lg: 48,
} as const;

export type RatingStarsSize = keyof typeof SIZE_MAP;

interface Props {
  /** Note actuelle (0 = aucune). */
  value?: number;
  /** Mode teaser : 5 étoiles contour identiques. */
  placeholder?: boolean;
  readonly?: boolean;
  onChange?: (value: number) => void;
  size?: RatingStarsSize;
  max?: number;
  showValue?: boolean;
  centered?: boolean;
  /** Affichage compact (sans zone tactile large) — ex. bouton carte avis. */
  dense?: boolean;
  /** Étoiles sur fond ambre (bouton rating). */
  tone?: 'default' | 'warm';
  style?: StyleProp<ViewStyle>;
}

function starVisual(c: AppColors, filled: boolean, tone: 'default' | 'warm') {
  if (filled) {
    return {
      color: c.star,
      fill: c.starFill,
      strokeWidth: 1.25,
    };
  }
  return {
    color: tone === 'warm' ? hexToRgba(c.star, 0.72) : hexToRgba(c.star, 0.38),
    fill: 'transparent' as const,
    strokeWidth: tone === 'warm' ? 1.75 : 2,
  };
}

export function RatingStars({
  value = 0,
  placeholder = false,
  readonly = false,
  onChange,
  size = 'md',
  max = 5,
  showValue = false,
  centered = false,
  dense = false,
  tone = 'default',
  style,
}: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'features_reviews_components_RatingStars_tsx_styles');
  const starSize = SIZE_MAP[size];
  const gap = GAP_MAP[size];
  const touch = dense ? starSize + 2 : TOUCH_MAP[size];
  const interactive = !readonly && !placeholder && Boolean(onChange);
  const clamped = Math.min(max, Math.max(0, Math.round(value)));

  return (
    <Row
      align="center"
      gap={gap}
      justify={centered ? 'center' : undefined}
      style={style}
    >
      {Array.from({ length: max }, (_, i) => {
        const index = i + 1;
        const filled = !placeholder && index <= clamped;
        const visual = starVisual(c, filled, tone);

        const star = (
          <Star
            size={starSize}
            color={visual.color}
            fill={visual.fill}
            strokeWidth={visual.strokeWidth}
          />
        );

        if (!interactive) {
          return (
            <View key={index} style={[styles.cell, { width: touch, height: touch }]}>
              {star}
            </View>
          );
        }

        return (
          <Pressable
            key={index}
            onPress={() => onChange?.(index)}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel={`${index} étoile${index > 1 ? 's' : ''}`}
            accessibilityState={{ selected: index <= clamped }}
            style={({ pressed }) => [
              styles.cell,
              styles.cellInteractive,
              { width: touch, height: touch },
              pressed && styles.cellPressed,
            ]}
          >
            {star}
          </Pressable>
        );
      })}
      {showValue ? (
        <AppText style={[styles.value, { color: c.warning, fontSize: starSize * 0.72 }]}>
          {clamped}/{max}
        </AppText>
      ) : null}
    </Row>
  );
}

function buildStyles(c: AppColors) {
  return {
    cell: {
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    cellInteractive: {
      borderRadius: 999,
    },
    cellPressed: {
      backgroundColor: hexToRgba(c.star, 0.12),
    },
    value: {
      fontFamily: fontFamily.semiBold,
      marginLeft: spacing[1],
    },
  };
}

