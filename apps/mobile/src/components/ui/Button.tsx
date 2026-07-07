import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import React, { useCallback } from 'react';
import { Pressable, ActivityIndicator, StyleSheet, type PressableProps } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { animation, radius, spacing } from '@/theme';
import { useAppColors } from '@/theme/use-app-colors';
import { fontFamily, fontSize } from '@/theme/typography';
import { scaleLayoutSize } from '@/theme/text-scale';

type Variant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'muted'
  | 'destructive'
  | 'dangerOutline'
  | 'teal';
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
  style?: PressableProps['style'];
}

const sizeStyleBase: Record<
  Size,
  { paddingVertical: number; paddingHorizontal: number; borderRadius: number; baseMinHeight: number }
> = {
  mini: { paddingVertical: spacing[2], paddingHorizontal: spacing[2], borderRadius: radius.md, baseMinHeight: 40 },
  sm: { paddingVertical: spacing[2], paddingHorizontal: spacing[4], borderRadius: radius.md, baseMinHeight: 44 },
  md: { paddingVertical: spacing[3], paddingHorizontal: spacing[5], borderRadius: radius.lg, baseMinHeight: 44 },
  lg: { paddingVertical: spacing[4], paddingHorizontal: spacing[6], borderRadius: radius.xl, baseMinHeight: 48 },
};

function triggerHaptic() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

function variantStyleFor(variant: Variant, c: ReturnType<typeof useAppColors>): object {
  switch (variant) {
    case 'primary':
      return { backgroundColor: c.primary };
    case 'secondary':
      return { backgroundColor: c.primaryMid };
    case 'outline':
      return { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: c.primary };
    case 'ghost':
      return { backgroundColor: 'transparent' };
    case 'muted':
      return { backgroundColor: c.surfaceSubtle };
    case 'destructive':
      return { backgroundColor: c.error };
    case 'dangerOutline':
      return { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: c.error };
    case 'teal':
      return { backgroundColor: c.primaryDark };
    default:
      return { backgroundColor: c.primary };
  }
}

function textColorFor(variant: Variant, c: ReturnType<typeof useAppColors>): string {
  switch (variant) {
    case 'primary':
    case 'destructive':
    case 'teal':
      return c.textInverse;
    case 'secondary':
    case 'outline':
      return c.primary;
    case 'dangerOutline':
      return c.error;
    default:
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
  const styles = useThemedStyles(buildStyles, 'components_ui_Button_tsx_ButtonComponent_styles');

  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.965, animation.spring.snappy);
    opacity.value = withSpring(0.92, animation.spring.snappy);
  }, [scale, opacity]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, animation.spring.bouncy);
    opacity.value = withSpring(1, animation.spring.snappy);
  }, [scale, opacity]);

  const handlePress = useCallback(
    (e: Parameters<NonNullable<PressableProps['onPress']>>[0]) => {
      runOnJS(triggerHaptic)();
      onPress?.(e);
    },
    [onPress],
  );

  const isDisabled = disabled || loading;

  const isMini = size === 'mini';

  return (
    <Animated.View
      style={[
        fullWidth && styles.fullWidth,
        isMini && styles.inlineWrap,
        animatedStyle,
      ]}
    >
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityLabel={props.accessibilityLabel ?? (iconOnly ? title : undefined)}
        style={[
          styles.base,
          styles.size[size],
          variantStyleFor(variant, c),
          isDisabled && styles.disabled,
          fullWidth && styles.fullWidth,
          style,
        ]}
        {...props}
      >
        {loading ? (
          <ActivityIndicator
            size="small"
            color={
              variant === 'outline' ||
              variant === 'ghost' ||
              variant === 'secondary' ||
              variant === 'muted'
                ? c.primary
                : variant === 'dangerOutline'
                  ? c.error
                  : c.textInverse
            }
          />
        ) : iconOnly ? (
          leftIcon ?? rightIcon ?? null
        ) : (
          <>
            {leftIcon ?? null}
            <Animated.Text
              style={[
                isMini ? styles.textMini : styles.text,
                styles.textSize[size],
                { color: textColorFor(variant, c) },
                leftIcon || rightIcon
                  ? isMini
                    ? styles.textWithIconMini
                    : styles.textWithIcon
                  : null,
              ]}
            >
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

function buildStyles(c: AppColors) {
  const textSizeStyles = {
    mini: { fontSize: fontSize.xs },
    sm: { fontSize: fontSize.sm },
    md: { fontSize: fontSize.base },
    lg: { fontSize: fontSize.md },
  } as const;

  const sizeStyles = {
    mini: {
      paddingVertical: sizeStyleBase.mini.paddingVertical,
      paddingHorizontal: sizeStyleBase.mini.paddingHorizontal,
      borderRadius: sizeStyleBase.mini.borderRadius,
      minHeight: scaleLayoutSize(sizeStyleBase.mini.baseMinHeight),
      gap: 3,
    },
    sm: {
      paddingVertical: sizeStyleBase.sm.paddingVertical,
      paddingHorizontal: sizeStyleBase.sm.paddingHorizontal,
      borderRadius: sizeStyleBase.sm.borderRadius,
      minHeight: scaleLayoutSize(sizeStyleBase.sm.baseMinHeight),
      gap: 0,
    },
    md: {
      paddingVertical: sizeStyleBase.md.paddingVertical,
      paddingHorizontal: sizeStyleBase.md.paddingHorizontal,
      borderRadius: sizeStyleBase.md.borderRadius,
      minHeight: scaleLayoutSize(sizeStyleBase.md.baseMinHeight),
      gap: 0,
    },
    lg: {
      paddingVertical: sizeStyleBase.lg.paddingVertical,
      paddingHorizontal: sizeStyleBase.lg.paddingHorizontal,
      borderRadius: sizeStyleBase.lg.borderRadius,
      minHeight: scaleLayoutSize(sizeStyleBase.lg.baseMinHeight),
      gap: 0,
    },
  } as const;

  return {
  base: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  inlineWrap: {
    flexShrink: 0,
    alignSelf: 'center' as const,
  },
  fullWidth: {
    width: '100%' as const,
  },
  text: {
    fontFamily: fontFamily.semiBold,
    letterSpacing: 0.1,
  },
  textMini: {
    fontFamily: fontFamily.medium,
    letterSpacing: 0,
  },
  textWithIcon: {
    marginHorizontal: spacing[2],
  },
  textWithIconMini: {
    marginHorizontal: 0,
  },
  disabled: {
    opacity: 0.45,
  },
  size: sizeStyles,
  textSize: textSizeStyles,
};
}
