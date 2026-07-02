import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { useAppPreferencesStore } from '@/store/app-preferences-store';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Row } from '@/components/layout/primitives';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { ChevronRight } from 'lucide-react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {
  catalogGroupFilterEmoji,
  catalogGroupTheme,
  type CareFilterTab,
} from '../utils/booking-care-catalog';
import { animation, elevation, radius, spacing } from '@/theme';
import { hexToRgba } from '@/theme/color-utils';
import { fontFamily, fontSize } from '@/theme/typography';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const H_PAD = spacing[4];
const CHIP_GAP = spacing[2.5];
const EMOJI_ORB = 36;
const FADE_W = 36;
const HINT_RAIL_W = 38;
const SWIPE_HINT_NUDGE = 6;

interface Props {
  tabs: CareFilterTab[];
  value: string;
  onChange: (value: string) => void;
}

function FilterChip({
  tab,
  active,
  onPress,
  onLayout,
}: {
  tab: CareFilterTab;
  active: boolean;
  onPress: () => void;
  onLayout: (width: number) => void;
}) {
  const styles = useThemedStyles(buildStyles);
  const theme = catalogGroupTheme(tab.value);
  const emoji = catalogGroupFilterEmoji(tab.value);
  const scale = useSharedValue(1);
  const activeProgress = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    activeProgress.value = withSpring(active ? 1 : 0, animation.spring.snappy);
  }, [active, activeProgress]);

  const chipAnimStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: scale.value * (1 + activeProgress.value * 0.018),
      },
    ],
  }));

  const chipStyle: StyleProp<ViewStyle> = active
    ? {
        backgroundColor: theme.surfaceActive,
        borderColor: theme.borderActive,
      }
    : null;

  return (
    <AnimatedPressable
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      onPressIn={() => {
        scale.value = withSpring(0.975, animation.spring.snappy);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, animation.spring.bouncy);
      }}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`Filtrer par ${tab.label}`}
      onLayout={(e) => onLayout(e.nativeEvent.layout.width)}
      style={[styles.chipHit, chipAnimStyle]}
    >
      <Row
        gap={spacing[2.5]}
        align="center"
        style={[
          styles.chip,
          !active && styles.chipIdle,
          chipStyle,
          active && styles.chipActive,
        ]}
      >
        {active ? (
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(255,255,255,0.42)', 'rgba(255,255,255,0)']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
          />
        ) : null}
        <View
          style={[
            styles.emojiOrb,
            { backgroundColor: theme.orb },
            active && styles.emojiOrbActive,
          ]}
        >
          <Text style={styles.emojiGlyph} accessibilityElementsHidden>
            {emoji}
          </Text>
        </View>
        <Text
          style={[
            styles.label,
            active ? { color: theme.labelActive } : null,
          ]}
          numberOfLines={1}
        >
          {tab.label}
        </Text>
      </Row>
    </AnimatedPressable>
  );
}

function SwipeHintRail({ visible }: { visible: boolean }) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles);
  const nudge = useSharedValue(0);
  const railOpacity = useSharedValue(visible ? 1 : 0);
  const breathe = useSharedValue(1);

  useEffect(() => {
    railOpacity.value = withTiming(visible ? 1 : 0, { duration: 320 });
    if (!visible) {
      cancelAnimation(nudge);
      cancelAnimation(breathe);
      nudge.value = 0;
      breathe.value = 1;
      return;
    }
    nudge.value = withRepeat(
      withSequence(
        withSpring(SWIPE_HINT_NUDGE, animation.spring.gentle),
        withSpring(0, animation.spring.gentle),
      ),
      -1,
      false,
    );
    breathe.value = withRepeat(
      withSequence(
        withTiming(0.72, { duration: 900 }),
        withTiming(1, { duration: 900 }),
      ),
      -1,
      true,
    );
    return () => {
      cancelAnimation(nudge);
      cancelAnimation(breathe);
    };
  }, [breathe, nudge, visible]);

  const iconAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: nudge.value }],
    opacity: breathe.value,
  }));

  const railAnimStyle = useAnimatedStyle(() => ({
    opacity: railOpacity.value,
    transform: [{ translateX: (1 - railOpacity.value) * 10 }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.swipeRail, railAnimStyle]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <LinearGradient
        pointerEvents="none"
        colors={[
          `${c.bookingCanvas}00`,
          hexToRgba(c.primary, 0.05),
          hexToRgba(c.primary, 0.16),
          hexToRgba(c.surface, 0.98),
        ]}
        locations={[0, 0.35, 0.72, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.swipeRailGradient}
      />
      <Animated.View style={[styles.swipeRailIconBadge, iconAnimStyle]}>
        <ChevronRight size={18} color={c.primaryDark} strokeWidth={2.75} />
      </Animated.View>
    </Animated.View>
  );
}

function EdgeFade({
  side,
  baseColor,
  visible,
}: {
  side: 'left' | 'right';
  baseColor: string;
  visible: boolean;
}) {
  const styles = useThemedStyles(buildStyles);
  const opacity = useSharedValue(visible ? 1 : 0);

  useEffect(() => {
    opacity.value = withTiming(visible ? 1 : 0, { duration: 220 });
  }, [opacity, visible]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const colors = (
    side === 'left'
      ? [baseColor, hexToRgba(baseColor, 0.65), `${baseColor}00`]
      : [`${baseColor}00`, hexToRgba(baseColor, 0.65), baseColor]
  ) as [string, string, string];

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.fade,
        side === 'left' ? styles.fadeLeft : styles.fadeRight,
        animStyle,
      ]}
    >
      <LinearGradient
        pointerEvents="none"
        colors={colors}
        locations={[0, 0.55, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

export function CareCategoryFilterBar({ tabs, value, onChange }: Props) {
  const styles = useThemedStyles(buildStyles);
  const colorblindType = useAppPreferencesStore((s) => s.colorblindType);
  const textScale = useAppPreferencesStore((s) => s.textScale);
  const scrollRef = useRef<ScrollView>(null);
  const chipWidthsRef = useRef<Record<string, number>>({});
  const [scrollX, setScrollX] = useState(0);
  const [contentW, setContentW] = useState(0);
  const [trackW, setTrackW] = useState(0);
  const [hintDismissed, setHintDismissed] = useState(false);
  const [snapOffsets, setSnapOffsets] = useState<number[]>([]);

  const rebuildSnapOffsets = useCallback(() => {
    let x = 0;
    const offsets: number[] = [];
    for (const tab of tabs) {
      offsets.push(x);
      const w = chipWidthsRef.current[tab.value];
      if (w == null) continue;
      x += w + CHIP_GAP;
    }
    if (offsets.length === tabs.length) {
      setSnapOffsets(offsets);
    }
  }, [tabs]);

  const onChipLayout = useCallback(
    (tabValue: string, width: number) => {
      const rounded = Math.round(width);
      if (chipWidthsRef.current[tabValue] === rounded) return;
      chipWidthsRef.current[tabValue] = rounded;
      rebuildSnapOffsets();
    },
    [rebuildSnapOffsets],
  );

  const activeIndex = tabs.findIndex((t) => t.value === value);

  const scrollToIndex = useCallback(
    (index: number, animated = true) => {
      if (index < 0 || tabs.length === 0 || trackW <= 0) return;
      const offset = snapOffsets[index];
      if (offset == null) return;
      const tab = tabs[index];
      const chipW = tab ? chipWidthsRef.current[tab.value] ?? 0 : 0;
      const maxScroll = Math.max(0, contentW - trackW);
      const centered = offset - Math.max(0, (trackW - chipW) * 0.18);
      const x = Math.min(maxScroll, Math.max(0, centered));
      scrollRef.current?.scrollTo({ x, animated });
    },
    [contentW, snapOffsets, tabs, trackW],
  );

  useEffect(() => {
    chipWidthsRef.current = {};
    setSnapOffsets([]);
  }, [tabs, colorblindType, textScale]);

  useEffect(() => {
    if (activeIndex >= 0) {
      scrollToIndex(activeIndex, true);
    }
  }, [activeIndex, scrollToIndex, colorblindType, textScale]);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    setScrollX(x);
    if (x > 8) setHintDismissed(true);
  }, []);

  const onContentSizeChange = useCallback((w: number) => {
    setContentW(w);
  }, []);

  const onTrackLayout = useCallback((e: LayoutChangeEvent) => {
    setTrackW(e.nativeEvent.layout.width);
  }, []);

  const showRightFade = contentW > trackW + 4 && scrollX < contentW - trackW - 8;
  const showLeftFade = scrollX > 8;
  const showSwipeHint = showRightFade && !hintDismissed && tabs.length > 1;

  const handlePress = useCallback(
    (tab: CareFilterTab) => {
      const active = value === tab.value;
      if (active && tab.value === 'all') return;
      onChange(active ? 'all' : tab.value);
    },
    [onChange, value],
  );

  if (tabs.length === 0) return null;

  const c = useAppColors();
  const fadeBase = c.bookingCanvas;

  return (
    <View style={styles.shell} onLayout={onTrackLayout}>
      <ScrollView
        ref={scrollRef}
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToOffsets={snapOffsets.length > 1 ? snapOffsets : undefined}
        snapToAlignment="start"
        disableIntervalMomentum
        onScroll={onScroll}
        scrollEventThrottle={16}
        onContentSizeChange={onContentSizeChange}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Row gap={CHIP_GAP} align="center">
          {tabs.map((tab) => (
            <FilterChip
              key={tab.value}
              tab={tab}
              active={value === tab.value}
              onLayout={(w) => onChipLayout(tab.value, w)}
              onPress={() => handlePress(tab)}
            />
          ))}
        </Row>
      </ScrollView>

      <EdgeFade side="left" baseColor={fadeBase} visible={showLeftFade} />
      <EdgeFade
        side="right"
        baseColor={fadeBase}
        visible={showRightFade && !showSwipeHint}
      />
      <SwipeHintRail visible={showSwipeHint} />
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
    shell: {
      marginHorizontal: -H_PAD,
      position: 'relative' as const,
      overflow: 'hidden' as const,
    },
    scrollContent: {
      paddingHorizontal: H_PAD,
      paddingVertical: spacing[2.5],
      paddingRight: H_PAD + spacing[1],
    },
    chipHit: {
      flexShrink: 0,
      borderRadius: radius.full,
    },
    chip: {
      minHeight: 56,
      paddingHorizontal: spacing[3.5],
      paddingVertical: spacing[2.5],
      borderRadius: radius.full,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.surface,
      overflow: 'hidden' as const,
      alignSelf: 'flex-start' as const,
    },
    chipIdle: {
      ...elevation.xs,
    },
    chipActive: {
      borderWidth: 2,
      ...elevation.sm,
    },
    emojiOrb: {
      width: EMOJI_ORB,
      height: EMOJI_ORB,
      borderRadius: EMOJI_ORB / 2,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      flexShrink: 0,
    },
    emojiOrbActive: {
      transform: [{ scale: 1.04 }],
    },
    emojiGlyph: {
      fontSize: 18,
      lineHeight: 20,
      textAlign: 'center' as const,
    },
    label: {
      flexShrink: 0,
      fontFamily: fontFamily.bold,
      fontSize: fontSize.base,
      color: c.textSecondary,
      letterSpacing: -0.2,
    },
    fade: {
      position: 'absolute' as const,
      top: 0,
      bottom: 0,
      width: FADE_W,
      zIndex: 2,
    },
    fadeLeft: {
      left: 0,
    },
    fadeRight: {
      right: 0,
    },
    swipeRail: {
      position: 'absolute' as const,
      right: 0,
      top: 0,
      bottom: 0,
      width: HINT_RAIL_W,
      zIndex: 4,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      overflow: 'hidden' as const,
      borderTopLeftRadius: radius.lg,
      borderBottomLeftRadius: radius.lg,
    },
    swipeRailGradient: {
      ...StyleSheet.absoluteFillObject,
    },
    swipeRailIconBadge: {
      width: 30,
      height: 30,
      borderRadius: radius.full,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.primaryMid,
      ...elevation.xs,
    },
  };
}
