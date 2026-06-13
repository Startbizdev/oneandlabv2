import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import React, { useEffect, type ReactNode } from 'react';
import { StyleSheet, type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { radius } from '@/theme';

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

function SkeletonComponent({
  width,
  height = 16,
  borderRadius = radius.md,
  style,
}: SkeletonProps) {
  const styles = useThemedStyles(buildStyles, 'components_ui_Skeleton_tsx_SkeletonComponent_styles');

  const shimmer = useSharedValue(0.5);

  useEffect(() => {
    shimmer.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.4, { duration: 700, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [shimmer]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: shimmer.value,
  }));

  return (
    <Animated.View
      style={[
        styles.base,
        { height, borderRadius, width: width as ViewStyle['width'] },
        animStyle,
        style,
      ]}
    />
  );
}

export const Skeleton = React.memo(SkeletonComponent);
Skeleton.displayName = 'Skeleton';

interface SkeletonGroupProps {
  count?: number;
  height?: number;
  gap?: number;
  style?: ViewStyle;
}

function SkeletonGroupComponent({ count = 3, height = 80, gap = 12, style }: SkeletonGroupProps) {
  return (
    <Animated.View style={[{ gap }, style]}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} height={height} borderRadius={radius.xl} />
      ))}
    </Animated.View>
  );
}

export const SkeletonGroup = React.memo(SkeletonGroupComponent);
SkeletonGroup.displayName = 'SkeletonGroup';

function buildStyles(c: AppColors) {
  return {
  base: {
    backgroundColor: c.surfaceSubtle,
    width: '100%' as const,
  },
};
}
