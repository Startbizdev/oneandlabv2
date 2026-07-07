import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { Row } from '@/components/layout/primitives';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  clampAvailabilityRange,
  formatBookingHour,
  isAvailabilityRangeValid,
} from '../utils/booking-availability-utils';
import { AVAILABILITY_MIN_SPAN_HOURS } from '@oneandlab/shared-constants';
import { animation, radius, spacing, AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

const THUMB = 24;

interface Props {
  min: number;
  max: number;
  range: [number, number];
  onChange: (range: [number, number]) => void;
}

function triggerHaptic() {
  Haptics.selectionAsync();
}

export function BookingTimeRangeSlider({ min, max, range, onChange }: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'features_appointments_form_components_BookingTimeRangeSlider_tsx_styles');
  const [trackWidth, setTrackWidth] = useState(0);
  const trackWidthSv = useSharedValue(0);
  const minSv = useSharedValue(min);
  const maxSv = useSharedValue(max);
  const loX = useSharedValue(0);
  const hiX = useSharedValue(0);
  const loStart = useSharedValue(0);
  const hiStart = useSharedValue(0);
  const rangeRef = useRef(range);

  rangeRef.current = range;
  minSv.value = min;
  maxSv.value = max;

  const syncPositions = useCallback(
    (lo: number, hi: number, width: number) => {
      if (width <= 0) return;
      const s = Math.max(1, max - min);
      loX.value = ((lo - min) / s) * width;
      hiX.value = ((hi - min) / s) * width;
    },
    [max, min, hiX, loX],
  );

  const applyRange = useCallback(
    (lo: number, hi: number) => {
      const next = clampAvailabilityRange(lo, hi, max, min);
      const prev = rangeRef.current;
      if (next[0] !== prev[0] || next[1] !== prev[1]) {
        triggerHaptic();
      }
      onChange(next);
      syncPositions(next[0], next[1], trackWidth);
    },
    [max, min, onChange, syncPositions, trackWidth],
  );

  useEffect(() => {
    syncPositions(range[0], range[1], trackWidth);
  }, [range, syncPositions, trackWidth]);

  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const w = e.nativeEvent.layout.width;
      setTrackWidth(w);
      trackWidthSv.value = w;
      syncPositions(range[0], range[1], w);
    },
    [range, syncPositions, trackWidthSv],
  );

  const loGesture = Gesture.Pan()
    .onStart(() => {
      loStart.value = loX.value;
    })
    .onUpdate((e) => {
      const w = trackWidthSv.value;
      if (w <= 0) return;
      const minGap = (AVAILABILITY_MIN_SPAN_HOURS / Math.max(1, maxSv.value - minSv.value)) * w;
      loX.value = Math.max(0, Math.min(hiX.value - minGap, loStart.value + e.translationX));
    })
    .onEnd(() => {
      const w = trackWidthSv.value;
      if (w <= 0) return;
      const s = Math.max(1, maxSv.value - minSv.value);
      runOnJS(applyRange)(
        Math.round(minSv.value + (loX.value / w) * s),
        Math.round(minSv.value + (hiX.value / w) * s),
      );
      loX.value = withSpring(loX.value, animation.spring.snappy);
    });

  const hiGesture = Gesture.Pan()
    .onStart(() => {
      hiStart.value = hiX.value;
    })
    .onUpdate((e) => {
      const w = trackWidthSv.value;
      if (w <= 0) return;
      const minGap = (AVAILABILITY_MIN_SPAN_HOURS / Math.max(1, maxSv.value - minSv.value)) * w;
      hiX.value = Math.max(loX.value + minGap, Math.min(w, hiStart.value + e.translationX));
    })
    .onEnd(() => {
      const w = trackWidthSv.value;
      if (w <= 0) return;
      const s = Math.max(1, maxSv.value - minSv.value);
      runOnJS(applyRange)(
        Math.round(minSv.value + (loX.value / w) * s),
        Math.round(minSv.value + (hiX.value / w) * s),
      );
      hiX.value = withSpring(hiX.value, animation.spring.snappy);
    });

  const rangeFillStyle = useAnimatedStyle(() => ({
    left: loX.value,
    width: Math.max(0, hiX.value - loX.value),
  }));

  const loThumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: loX.value - THUMB / 2 }],
  }));

  const hiThumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: hiX.value - THUMB / 2 }],
  }));

  const valid = isAvailabilityRangeValid(range);
  const ticks = useMemo(() => [min, max], [min, max]);

  return (
    <View style={styles.wrap}>
      <Row gap={spacing[2]} justify="center">
        <AppText style={styles.timeValue}>{formatBookingHour(range[0])}</AppText>
        <AppText style={styles.timeSep}>—</AppText>
        <AppText style={styles.timeValue}>{formatBookingHour(range[1])}</AppText>
      </Row>

      <View style={styles.trackShell} onLayout={onLayout}>
        <View style={styles.trackBase} />
        <Animated.View style={[styles.trackFill, rangeFillStyle]}>
          <LinearGradient
            colors={[c.gradientStart, c.gradientEnd]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        <GestureDetector gesture={loGesture}>
          <Animated.View style={[styles.thumb, loThumbStyle]}>
            <View style={styles.thumbDot} />
          </Animated.View>
        </GestureDetector>

        <GestureDetector gesture={hiGesture}>
          <Animated.View style={[styles.thumb, hiThumbStyle]}>
            <View style={styles.thumbDot} />
          </Animated.View>
        </GestureDetector>
      </View>

      <Row justify="between">
        {ticks.map((h) => (
          <AppText key={h} style={styles.tick}>
            {formatBookingHour(h)}
          </AppText>
        ))}
      </Row>

      {!valid ? (
        <AppText style={styles.warn}>Minimum {AVAILABILITY_MIN_SPAN_HOURS} h</AppText>
      ) : null}
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
  wrap: {
    gap: spacing[2],
    paddingTop: spacing[1],
  },
  timeValue: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    color: c.textPrimary,
    fontVariant: ['tabular-nums' as const],
  },
  timeSep: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: c.textTertiary,
  },
  trackShell: {
    height: THUMB + 4,
    justifyContent: 'center' as const,
  },
  trackBase: {
    height: 4,
    borderRadius: radius.full,
    backgroundColor: c.border,
  },
  trackFill: {
    position: 'absolute' as const,
    height: 4,
    borderRadius: radius.full,
    overflow: 'hidden' as const,
  },
  thumb: {
    position: 'absolute' as const,
    top: 2,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: c.surface,
    borderWidth: 2,
    borderColor: c.primary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  thumbDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: c.primary,
  },
  tick: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: c.textTertiary,
  },
  warn: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: c.error,
    textAlign: 'center' as const,
  },
};
}

