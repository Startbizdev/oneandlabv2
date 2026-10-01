import React, { useCallback } from 'react';
import {
  Pressable,
  ActivityIndicator,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { animation, MIN_TOUCH_TARGET, radius, spacing, useStyles, font, type AppColors, type Theme } from '@/theme';
import { useAppColors } from '@/theme/use-app-colors';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'muted' | 'destructive' | 'dangerOutline';
type Size = 'mini' | 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<PressableProps, 'style'> {
  title: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  /** Pastille icône seule (sans label visible). */
  iconOnly?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

function variantStyleFor(variant: Variant, c: AppColors) {
  switch (variant) {
    case 'primary':
      return { backgroundColor: c.primary };
    case 'secondary':
      return { backgroundColor: c.primaryLight };
    case 'outline':
      return { backgroundColor: 'transparent', borderWidth: 1, borderColor: c.border };
    case 'ghost':
      return { backgroundColor: 'transparent' };
    case 'muted':
      return { backgroundColor: c.surfaceAlt };
    case 'destructive':
      return { backgroundColor: c.error };
    case 'dangerOutline':
      return { backgroundColor: 'transparent', borderWidth: 1, borderColor: c.error };
  }
}

function textColorFor(variant: Variant, c: AppColors): string {
  switch (variant) {
    case 'primary':
      return c.onPrimary;
    case 'destructive':
      return c.textInverse;
    case 'secondary':
    case 'outline':
      return c.textLink;
    case 'dangerOutline':
      return c.error;
    case 'ghost':
    case 'muted':
      return c.textSecondary;
  }
}

function ButtonComponent({
  title,
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  fullWidth,
  iconOnly = false,
  leftIcon,
  rightIcon,
  style,
  onPress,
  ...props
}: ButtonProps) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);

  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.98, animation.spring.snappy);
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, animation.spring.snappy);
  }, [scale]);

  const handlePress = useCallback(
    (e: Parameters<NonNullable<PressableProps['onPress']>>[0]) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress?.(e);
    },
    [onPress],
  );

  const isDisabled = disabled || loading;
  const isMini = size === 'mini';
  const labelColor = textColorFor(variant, c);

  return (
    <Animated.View style={[fullWidth && styles.fullWidth, isMini && styles.inlineWrap, animatedStyle]}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityLabel={props.accessibilityLabel ?? title}
        style={[
          styles.base,
          styles[SIZE_STYLE_KEY[size]],
          variantStyleFor(variant, c),
          isDisabled && styles.disabled,
          fullWidth && styles.fullWidth,
          style,
        ]}
        {...props}
        accessibilityState={{ ...props.accessibilityState, disabled: !!isDisabled, ...(loading ? { busy: true } : null) }}
      >
        {loading ? (
          <ActivityIndicator size="small" color={variant === 'primary' ? c.onPrimary : labelColor} />
        ) : iconOnly ? (
          leftIcon ?? rightIcon ?? null
        ) : (
          <>
            {leftIcon ?? null}
            <Animated.Text style={[styles.label, styles[TEXT_SIZE_STYLE_KEY[size]], { color: labelColor }]}>
              {title}
            </Animated.Text>
            {rightIcon ?? null}
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

export const Button = React.memo(ButtonComponent);

const SIZE_STYLE_KEY = { mini: 'sizeMini', sm: 'sizeSm', md: 'sizeMd', lg: 'sizeLg' } as const;
const TEXT_SIZE_STYLE_KEY = {
  mini: 'textSizeMini',
  sm: 'textSizeSm',
  md: 'textSizeMd',
  lg: 'textSizeLg',
} as const;

function buildStyles({ fontSize, scale }: Theme) {
  return {
    base: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing[2],
      borderRadius: radius.md,
    },
    inlineWrap: {
      flexShrink: 0,
      alignSelf: 'center',
    },
    fullWidth: {
      width: '100%',
    },
    label: {
      ...font.semiBold,
      flexShrink: 1,
      textAlign: 'center',
    },
    disabled: {
      opacity: 0.45,
    },
    sizeMini: {
      minHeight: scale(MIN_TOUCH_TARGET),
      paddingVertical: spacing[2],
      paddingHorizontal: spacing[2],
      gap: spacing[1],
    },
    sizeSm: {
      minHeight: scale(MIN_TOUCH_TARGET),
      paddingVertical: spacing[2],
      paddingHorizontal: spacing[4],
    },
    sizeMd: {
      minHeight: scale(48),
      paddingVertical: spacing[3],
      paddingHorizontal: spacing[5],
    },
    sizeLg: {
      minHeight: scale(52),
      paddingVertical: spacing[3],
      paddingHorizontal: spacing[6],
    },
    textSizeMini: { ...font.medium, fontSize: fontSize.xs },
    textSizeSm: { fontSize: fontSize.sm },
    textSizeMd: { fontSize: fontSize.base },
    textSizeLg: { fontSize: fontSize.base },
  } as const;
}
