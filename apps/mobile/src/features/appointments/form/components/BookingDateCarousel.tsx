import type { AppColors } from '@/theme/colors';
import { getThemedStyles } from '@/theme/use-themed-styles';
import { colors } from '@/theme';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import {
  buildBookingDaySlides,
  dateToIsoDay,
  formatBookingDayLabel,
  isBookingDayDisabled,
  parseIsoDay,
  slideIndexForBookingDate,
} from '../utils/booking-date-utils';
import { animation, elevation, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const DAYS_PER_SLIDE = 10;
const COLS = 5;
const ROWS = 2;
const SLIDE_COUNT = 32;
const CELL_H = 60;

/** Ombre type iOS sur chaque tuile jour */
const iosDayShadow = {
  ...elevation.sm,
  shadowColor: '#0F172A',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 6,
} as const;

const iosDayShadowSelected = {
  ...elevation.md,
  shadowColor: colors.primaryDark,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.28,
  shadowRadius: 10,
} as const;

interface Props {
  value: string;
  onChange: (isoDay: string) => void;
  minLeadTimeHours?: number;
  acceptSaturday?: boolean;
  acceptSunday?: boolean;
}

function DayCell({
  day,
  selected,
  disabled,
  width,
  onPress,
}: {
  day: Dayjs;
  selected: boolean;
  disabled: boolean;
  width: number;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const { weekday, day: dayNum, month } = formatBookingDayLabel(day);
  const isToday = day.isSame(dayjs(), 'day');

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={() => {
        if (!disabled) scale.value = withSpring(0.94, animation.spring.snappy);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, animation.spring.bouncy);
      }}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      style={[
        animStyle,
        styles.cellOuter,
        { width, height: CELL_H },
        !selected && !disabled && iosDayShadow,
        selected && iosDayShadowSelected,
        disabled && styles.cellOuterDisabled,
      ]}
    >
      {selected ? (
        <LinearGradient
          colors={[colors.gradientStart, colors.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.cellInner, styles.cellInnerSelected]}
        >
          <Text style={[styles.weekday, styles.textOn]} numberOfLines={1}>
            {weekday}
          </Text>
          <Text style={[styles.dayNum, styles.textOn]}>{dayNum}</Text>
          <Text style={[styles.month, styles.textOnMuted]} numberOfLines={1}>
            {month}
          </Text>
        </LinearGradient>
      ) : (
        <View style={[styles.cellInner, styles.cellInnerDefault, isToday && styles.cellInnerToday]}>
          <Text style={[styles.weekday, disabled && styles.textOff]} numberOfLines={1}>
            {weekday}
          </Text>
          <Text style={[styles.dayNum, disabled && styles.textOff]}>{dayNum}</Text>
          <Text style={[styles.month, disabled && styles.textOff]} numberOfLines={1}>
            {month}
          </Text>
          {isToday && !disabled ? <View style={styles.todayDot} /> : null}
        </View>
      )}
    </AnimatedPressable>
  );
}

function DayGrid({
  slide,
  slideWidth,
  gap,
  cellWidth,
  selected,
  minLeadTimeHours,
  acceptSaturday,
  acceptSunday,
  onChange,
}: {
  slide: Dayjs[];
  slideWidth: number;
  gap: number;
  cellWidth: number;
  selected: ReturnType<typeof parseIsoDay>;
  minLeadTimeHours: number;
  acceptSaturday: boolean;
  acceptSunday: boolean;
  onChange: (iso: string) => void;
}) {
  const rows = [slide.slice(0, COLS), slide.slice(COLS, DAYS_PER_SLIDE)];

  return (
    <View style={[styles.slide, { width: slideWidth }]}>
      {rows.map((row, rowIdx) => (
        <View key={rowIdx} style={[styles.row, { gap, marginBottom: rowIdx === 0 ? gap : 0 }]}>
          {row.map((d) => {
            const iso = dateToIsoDay(d);
            const disabled = isBookingDayDisabled(d, minLeadTimeHours, {
              acceptSaturday,
              acceptSunday,
            });
            return (
              <DayCell
                key={iso}
                day={d}
                selected={selected?.isSame(d, 'day') ?? false}
                disabled={disabled}
                width={cellWidth}
                onPress={() => onChange(iso)}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

/** 10 jours · 5×2 · swipe entre périodes. */
export function BookingDateCarousel({
  value,
  onChange,
  minLeadTimeHours = 0,
  acceptSaturday = true,
  acceptSunday = true,
}: Props) {
  const listRef = useRef<FlatList<Dayjs[]>>(null);
  const [slideWidth, setSlideWidth] = useState(0);
  const [page, setPage] = useState(0);

  const slides = useMemo(
    () => buildBookingDaySlides(SLIDE_COUNT, DAYS_PER_SLIDE, minLeadTimeHours),
    [minLeadTimeHours],
  );

  const selected = parseIsoDay(value);
  const gap = spacing[2];
  const cellWidth =
    slideWidth > 0 ? (slideWidth - gap * (COLS - 1)) / COLS : 0;
  const listHeight = ROWS * CELL_H + gap + spacing[1];

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    setSlideWidth(e.nativeEvent.layout.width);
  }, []);

  const scrollToPage = useCallback(
    (index: number, animated = true) => {
      if (slideWidth <= 0) return;
      const clamped = Math.max(0, Math.min(index, slides.length - 1));
      listRef.current?.scrollToOffset({ offset: clamped * slideWidth, animated });
      setPage(clamped);
    },
    [slideWidth, slides.length],
  );

  useEffect(() => {
    if (value?.trim() || slides.length === 0) return;
    for (const slide of slides) {
      const first = slide.find(
        (d) =>
          !isBookingDayDisabled(d, minLeadTimeHours, { acceptSaturday, acceptSunday }),
      );
      if (first) {
        onChange(dateToIsoDay(first));
        break;
      }
    }
  }, [acceptSaturday, acceptSunday, minLeadTimeHours, onChange, slides, value]);

  useEffect(() => {
    if (!selected || slideWidth <= 0) return;
    const idx = slideIndexForBookingDate(selected, DAYS_PER_SLIDE, minLeadTimeHours);
    if (idx == null) return;
    scrollToPage(idx, false);
  }, [selected?.format('YYYY-MM-DD'), slideWidth, minLeadTimeHours, scrollToPage]);

  const onMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (slideWidth <= 0) return;
      const idx = Math.round(e.nativeEvent.contentOffset.x / slideWidth);
      setPage(Math.max(0, Math.min(idx, slides.length - 1)));
    },
    [slideWidth, slides.length],
  );

  const renderSlide = useCallback(
    ({ item: slide }: { item: Dayjs[] }) => (
      <DayGrid
        slide={slide}
        slideWidth={slideWidth}
        gap={gap}
        cellWidth={cellWidth}
        selected={selected}
        minLeadTimeHours={minLeadTimeHours}
        acceptSaturday={acceptSaturday}
        acceptSunday={acceptSunday}
        onChange={onChange}
      />
    ),
    [
      acceptSaturday,
      acceptSunday,
      cellWidth,
      gap,
      minLeadTimeHours,
      onChange,
      selected,
      slideWidth,
    ],
  );

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Date souhaitée</Text>

      <View style={styles.sliderHost} onLayout={onLayout}>
        {slideWidth > 0 ? (
          <FlatList
            ref={listRef}
            data={slides}
            horizontal
            pagingEnabled
            bounces={false}
            decelerationRate="fast"
            showsHorizontalScrollIndicator={false}
            clipToPadding={false}
            style={{ height: listHeight, overflow: 'visible' }}
            contentContainerStyle={styles.listContent}
            keyExtractor={(_, index) => String(index)}
            renderItem={renderSlide}
            onMomentumScrollEnd={onMomentumScrollEnd}
            getItemLayout={(_, index) => ({
              length: slideWidth,
              offset: slideWidth * index,
              index,
            })}
          />
        ) : (
          <View style={{ height: listHeight }} />
        )}
      </View>
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
  wrap: { gap: spacing[2] },
  label: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: c.textPrimary,
  },
  sliderHost: {
    overflow: 'visible',
    marginHorizontal: -spacing[0.5],
  },
  listContent: {
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[0.5],
  },
  slide: {
    paddingHorizontal: 0,
  },
  row: {
    flexDirection: 'row',
  },
  cellOuter: {
    borderRadius: radius.lg,
    backgroundColor: 'transparent',
  },
  cellOuterDisabled: {
    opacity: 0.38,
  },
  cellInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[1.5],
    paddingHorizontal: spacing[0.5],
    gap: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  cellInnerSelected: {
    borderWidth: 0,
  },
  cellInnerDefault: {
    backgroundColor: c.surface,
    borderWidth: 0,
  },
  cellInnerToday: {
    backgroundColor: c.primaryLight,
  },
  weekday: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: c.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  dayNum: {
    fontFamily: fontFamily.extraBold,
    fontSize: fontSize.lg,
    color: c.textPrimary,
    lineHeight: fontSize.lg + 2,
    fontVariant: ['tabular-nums'],
  },
  month: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: c.textTertiary,
    textTransform: 'capitalize',
  },
  todayDot: {
    position: 'absolute',
    bottom: 5,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: c.primary,
  },
  textOn: { color: c.textInverse },
  textOnMuted: { color: 'rgba(255,255,255,0.82)' },
  textOff: { color: c.textTertiary },
};
}

const styles = new Proxy({} as Record<string, any>, {
  get(_target, prop: string | symbol) {
    if (typeof prop === 'string') {
      return getThemedStyles('features_appointments_form_components_BookingDateCarousel_tsx_styles', buildStyles)[prop];
    }
    return undefined;
  },
});
