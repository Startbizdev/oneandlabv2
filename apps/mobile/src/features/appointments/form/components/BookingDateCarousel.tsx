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
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import {
  buildBookingDaySlides,
  dateToIsoDay,
  formatBookingDayCell,
  formatBookingSelectedDay,
  formatBookingSlidePeriod,
  isBookingDayDisabled,
  parseIsoDay,
  slideIndexForBookingDate,
} from '../utils/booking-date-utils';
import { animation, elevation, radius, spacing } from '@/theme';
import { FONT_SIZE_BASE, fontFamily, fontSize, lh } from '@/theme/typography';
import { getTextScaleMultiplier } from '@/theme/text-scale';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const DAYS_PER_SLIDE = 10;
const COLS = 5;
const ROWS = 2;
const SLIDE_COUNT = 32;

function bookingDayCellHeight(): number {
  const scale = getTextScaleMultiplier();
  const padY = spacing[1.5] * 2;
  const innerGap = 2;
  const weekdayH = lh(Math.round(FONT_SIZE_BASE['2xs'] * scale), 1.35);
  const dayH = lh(Math.round(FONT_SIZE_BASE.base * scale), 1.22);
  return padY + innerGap + weekdayH + dayH + spacing[1];
}

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
  height,
  onPress,
}: {
  day: Dayjs;
  selected: boolean;
  disabled: boolean;
  width: number;
  height: number;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const { weekday, day: dayNum } = formatBookingDayCell(day);
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
        if (!disabled) scale.value = withSpring(0.96, animation.spring.snappy);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, animation.spring.bouncy);
      }}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={day.locale('fr').format('dddd D MMMM')}
      accessibilityState={{ selected, disabled }}
      style={[
        animStyle,
        styles.cellOuter,
        { width, height },
        selected && styles.cellOuterSelected,
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
          <Text style={[styles.weekday, styles.textOn]} numberOfLines={1} adjustsFontSizeToFit>
            {weekday}
          </Text>
          <Text style={[styles.dayNum, styles.textOn]} adjustsFontSizeToFit minimumFontScale={0.85}>
            {dayNum}
          </Text>
        </LinearGradient>
      ) : (
        <View
          style={[
            styles.cellInner,
            styles.cellInnerDefault,
            isToday && !disabled && styles.cellInnerToday,
          ]}
        >
          <Text
            style={[styles.weekday, disabled && styles.textOff, isToday && !disabled && styles.weekdayToday]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {weekday}
          </Text>
          <Text
            style={[styles.dayNum, disabled && styles.textOff, isToday && !disabled && styles.dayNumToday]}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
          >
            {dayNum}
          </Text>
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
  cellHeight,
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
  cellHeight: number;
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
                height={cellHeight}
                onPress={() => onChange(iso)}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

function PeriodNavigator({
  label,
  page,
  pageCount,
  onPrev,
  onNext,
}: {
  label: string;
  page: number;
  pageCount: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  const canPrev = page > 0;
  const canNext = page < pageCount - 1;

  return (
    <View style={styles.periodNav}>
      <Pressable
        onPress={onPrev}
        disabled={!canPrev}
        hitSlop={8}
        style={[styles.navBtn, !canPrev && styles.navBtnDisabled]}
        accessibilityRole="button"
        accessibilityLabel="Période précédente"
      >
        <ChevronLeft size={18} color={canPrev ? colors.primary : colors.textTertiary} strokeWidth={2.5} />
      </Pressable>

      <View style={styles.periodCenter}>
        <Text style={styles.periodLabel} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.9}>
          {label}
        </Text>
        {pageCount > 1 ? (
          <Text style={styles.periodHint}>
            {page + 1} / {pageCount}
          </Text>
        ) : null}
      </View>

      <Pressable
        onPress={onNext}
        disabled={!canNext}
        hitSlop={8}
        style={[styles.navBtn, !canNext && styles.navBtnDisabled]}
        accessibilityRole="button"
        accessibilityLabel="Période suivante"
      >
        <ChevronRight size={18} color={canNext ? colors.primary : colors.textTertiary} strokeWidth={2.5} />
      </Pressable>
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
  const gap = spacing[1.5];
  const cellHeight = bookingDayCellHeight();
  const cellWidth = slideWidth > 0 ? (slideWidth - gap * (COLS - 1)) / COLS : 0;
  const listHeight = ROWS * cellHeight + gap + spacing[0.5];

  const periodLabel = useMemo(() => {
    const slide = slides[page];
    return slide ? formatBookingSlidePeriod(slide) : '';
  }, [page, slides]);

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
        cellHeight={cellHeight}
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
      cellHeight,
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

      <View style={styles.calendarCard}>
        <PeriodNavigator
          label={periodLabel}
          page={page}
          pageCount={slides.length}
          onPrev={() => scrollToPage(page - 1)}
          onNext={() => scrollToPage(page + 1)}
        />

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
              style={{ height: listHeight }}
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

        {selected ? (
          <View style={styles.selectedRecap}>
            <Text style={styles.selectedRecapText} numberOfLines={1}>
              {formatBookingSelectedDay(selected)}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function buildStyles(c: AppColors) {
  const weekdaySize = Math.round(FONT_SIZE_BASE['2xs'] * getTextScaleMultiplier());
  const daySize = Math.round(FONT_SIZE_BASE.base * getTextScaleMultiplier());

  return {
    wrap: { gap: spacing[2] },
    label: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.sm,
      color: c.textPrimary,
    },
    calendarCard: {
      gap: spacing[2.5],
      padding: spacing[3],
      borderRadius: radius.xl,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.borderLight,
      ...elevation.xs,
    },
    periodNav: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[2],
    },
    navBtn: {
      width: 34,
      height: 34,
      borderRadius: radius.md,
      backgroundColor: c.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    navBtnDisabled: {
      backgroundColor: c.surfaceSubtle,
      opacity: 0.7,
    },
    periodCenter: {
      flex: 1,
      alignItems: 'center',
      gap: 2,
    },
    periodLabel: {
      fontFamily: fontFamily.bold,
      fontSize: fontSize.sm,
      color: c.textPrimary,
      textAlign: 'center',
      textTransform: 'capitalize',
      letterSpacing: -0.2,
    },
    periodHint: {
      fontFamily: fontFamily.medium,
      fontSize: fontSize['2xs'],
      color: c.textTertiary,
    },
    sliderHost: {
      overflow: 'hidden',
    },
    listContent: {
      paddingVertical: spacing[0.5],
    },
    slide: {
      paddingHorizontal: 0,
    },
    row: {
      flexDirection: 'row',
    },
    cellOuter: {
      borderRadius: radius.md,
      backgroundColor: 'transparent',
    },
    cellOuterSelected: {
      ...elevation.sm,
      shadowColor: c.primaryDark,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 6,
    },
    cellOuterDisabled: {
      opacity: 0.42,
    },
    cellInner: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing[1.5],
      paddingHorizontal: spacing[0.5],
      gap: 2,
      borderRadius: radius.md,
      overflow: 'hidden',
    },
    cellInnerSelected: {
      borderWidth: 0,
    },
    cellInnerDefault: {
      backgroundColor: c.surfaceSubtle,
      borderWidth: 1,
      borderColor: c.borderLight,
    },
    cellInnerToday: {
      backgroundColor: c.surface,
      borderColor: c.primary,
      borderWidth: 1.5,
    },
    weekday: {
      fontFamily: fontFamily.semiBold,
      fontSize: weekdaySize,
      color: c.textTertiary,
      textTransform: 'capitalize',
      letterSpacing: 0.2,
      lineHeight: lh(weekdaySize, 1.35),
    },
    weekdayToday: {
      color: c.primary,
    },
    dayNum: {
      fontFamily: fontFamily.bold,
      fontSize: daySize,
      color: c.textPrimary,
      lineHeight: lh(daySize, 1.22),
      fontVariant: ['tabular-nums'],
    },
    dayNumToday: {
      color: c.primary,
    },
    textOn: { color: c.textInverse },
    textOff: { color: c.textTertiary },
    selectedRecap: {
      alignItems: 'center',
      paddingTop: spacing[1],
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.borderLight,
    },
    selectedRecapText: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.sm,
      color: c.primary,
      textTransform: 'capitalize',
    },
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
