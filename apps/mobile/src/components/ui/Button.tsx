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

const sizeStyle: Record<
  Size,
  { paddingVertical: number; paddingHorizontal: number; borderRadius: number; minHeight: number }
> = {
  mini: { paddingVertical: spacing[2], paddingHorizontal: spacing[2], borderRadius: radius.md, minHeight: 40 },
  sm: { paddingVertical: spacing[2], paddingHorizontal: spacing[4], borderRadius: radius.md, minHeight: 44 },
  md: { paddingVertical: spacing[3], paddingHorizontal: spacing[5], borderRadius: radius.lg, minHeight: 44 },
  lg: { paddingVertical: spacing[4], paddingHorizontal: spacing[6], borderRadius: radius.xl, minHeight: 48 },
};

const textSize: Record<Size, number> = {
  mini: fontSize.xs,
  sm: fontSize.sm,
  md: fontSize.base,
  lg: fontSize.md,
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
          { minHeight: sizeStyle[size].minHeight, gap: isMini ? 3 : 0 },
          variantStyleFor(variant, c),
          sizeStyle[size],
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
                { color: textColorFor(variant, c), fontSize: textSize[size] },
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

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineWrap: {
    flexShrink: 0,
    alignSelf: 'center',
  },
  fullWidth: {
    width: '100%',
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
});
