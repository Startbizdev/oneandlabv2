import { hexToRgba } from '@/theme/color-utils';
import { useAppColors } from '@/theme/use-app-colors';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { Star } from 'lucide-react-native';
import { spacing, AppText, useStyles, font, type Theme, ICON_STROKE_WIDTH, MIN_TOUCH_TARGET } from '@/theme';

const SIZE_MAP = {
  sm: 16,
  md: 20,
  lg: 36,
} as const;

const GAP_MAP = {
  sm: 2,
  md: spacing[1],
  lg: spacing[2],
} as const;

export type RatingStarsSize = keyof typeof SIZE_MAP;

interface Props {
  /** Note actuelle (0 = aucune). */
  value?: number;
  readonly?: boolean;
  onChange?: (value: number) => void;
  size?: RatingStarsSize;
  max?: number;
  showValue?: boolean;
  centered?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function RatingStars({
  value = 0,
  readonly = false,
  onChange,
  size = 'md',
  max = 5,
  showValue = false,
  centered = false,
  style,
}: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const starSize = SIZE_MAP[size];
  const interactive = !readonly && Boolean(onChange);
  const cell = interactive ? Math.max(MIN_TOUCH_TARGET, starSize + spacing[2]) : starSize;
  const clamped = Math.min(max, Math.max(0, Math.round(value)));

  return (
    <View
      style={[styles.row, { gap: GAP_MAP[size] }, centered && styles.centered, style]}
      accessible={!interactive}
      accessibilityLabel={interactive ? undefined : `Note : ${clamped} sur ${max}`}
    >
      {Array.from({ length: max }, (_, i) => {
        const index = i + 1;
        const filled = index <= clamped;
        const star = (
          <Star
            size={starSize}
            color={filled ? c.star : c.starEmpty}
            fill={filled ? c.starFill : 'transparent'}
            strokeWidth={ICON_STROKE_WIDTH}
          />
        );

        if (!interactive) {
          return (
            <View key={index} style={[styles.cell, { width: cell, height: cell }]}>
              {star}
            </View>
          );
        }

        return (
          <Pressable
            key={index}
            onPress={() => onChange?.(index)}
            accessibilityRole="button"
            accessibilityLabel={`${index} étoile${index > 1 ? 's' : ''}`}
            accessibilityState={{ selected: index <= clamped }}
            style={({ pressed }) => [
              styles.cell,
              styles.cellInteractive,
              { width: cell, height: cell },
              pressed && styles.cellPressed,
            ]}
          >
            {star}
          </Pressable>
        );
      })}
      {showValue ? (
        <AppText variant="caption" style={styles.value}>
          {clamped}/{max}
        </AppText>
      ) : null}
    </View>
  );
}

function buildStyles({ colors: c }: Theme) {
  return {
    row: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
    },
    centered: { justifyContent: 'center' as const },
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
      ...font.semiBold,
      marginLeft: spacing[1],
    },
  };
}
