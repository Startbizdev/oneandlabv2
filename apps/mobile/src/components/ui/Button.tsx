import React, { useCallback } from 'react';
import { Pressable, ActivityIndicator, StyleSheet, type PressableProps } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors, animation, radius, spacing } from '@/theme';
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
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: PressableProps['style'];
}

const variantStyle: Record<Variant, object> = {
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.primaryMid },
  outline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.primary },
  ghost: { backgroundColor: 'transparent' },
  muted: { backgroundColor: colors.surfaceSubtle },
  destructive: { backgroundColor: colors.error },
  dangerOutline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.error },
  teal: { backgroundColor: colors.primaryDark },
};

const textColor: Record<Variant, string> = {
  primary: colors.textInverse,
  secondary: colors.primary,
  outline: colors.primary,
  ghost: colors.textSecondary,
  muted: colors.textSecondary,
  destructive: colors.textInverse,
  dangerOutline: colors.error,
  teal: colors.textInverse,
};

const sizeStyle: Record<
  Size,
  { paddingVertical: number; paddingHorizontal: number; borderRadius: number; minHeight: number }
> = {
  mini: { paddingVertical: 4, paddingHorizontal: 6, borderRadius: radius.sm, minHeight: 28 },
  sm: { paddingVertical: spacing[2], paddingHorizontal: spacing[4], borderRadius: radius.md, minHeight: 44 },
  md: { paddingVertical: spacing[3], paddingHorizontal: spacing[5], borderRadius: radius.lg, minHeight: 44 },
  lg: { paddingVertical: spacing[4], paddingHorizontal: spacing[6], borderRadius: radius.xl, minHeight: 48 },
};

const textSize: Record<Size, number> = {
  mini: fontSize['2xs'],
  sm: fontSize.sm,
  md: fontSize.base,
  lg: fontSize.md,
};

function triggerHaptic() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

function ButtonComponent({
  title,
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  fullWidth,
  leftIcon,
  rightIcon,
  style,
  onPress,
  ...props
}: ButtonProps) {
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
        style={[
          styles.base,
          { minHeight: sizeStyle[size].minHeight, gap: isMini ? 3 : 0 },
          variantStyle[variant],
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
                ? colors.primary
                : variant === 'dangerOutline'
                  ? colors.error
                  : colors.textInverse
            }
          />
        ) : (
          <>
            {leftIcon ?? null}
            <Animated.Text
              style={[
                isMini ? styles.textMini : styles.text,
                { color: textColor[variant], fontSize: textSize[size] },
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
