import { useAppColors } from '@/theme/use-app-colors';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, LayoutChangeEvent, Pressable, StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { Row } from '@/components/layout/primitives';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import {
  buildBookingDaySlides,
  dateToIsoDay,
  formatBookingDayCell,
  formatBookingSlidePeriod,
  isBookingDayDisabled,
  parseIsoDay,
  slideIndexForBookingDate,
} from '../utils/booking-date-utils';
import { FullWidthSegmentBar } from '@/components/ui/FullWidthSegmentBar';
import { ICON_STROKE_WIDTH, animation, radius, spacing, iconSize, AppText, useStyles, useTheme, font, type Theme } from '@/theme';
import { lh } from '@/theme/typography';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const DAYS_PER_SLIDE = 10;
const COLS = 5;
const ROWS = 2;
const SLIDE_COUNT = 32;

function bookingDayCellHeight(fontSize: Theme['fontSize']): number {
  const padY = spacing[1.5] * 2;
  const innerGap = 2;
  const weekdayH = lh(fontSize['2xs'], 1.35);
  const dayH = lh(fontSize.base, 1.22);
  return padY + innerGap + weekdayH + dayH + spacing[1];
}

interface Props {
  value: string;
  onChange: (isoDay: string) => void;
  minLeadTimeHours?: number;
  acceptSaturday?: boolean;
  acceptSunday?: boolean;
  /** Prise de sang : onglet Une date / Multiple sur ce calendrier. */
  allowMultiple?: boolean;
  selectionMode?: 'single' | 'multiple';
  onSelectionModeChange?: (mode: 'single' | 'multiple') => void;
  /** Jours déjà cochés, YYYY-MM-DD, quand le mode Multiple est actif. */
  selectedDates?: string[];
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
  const styles = useStyles(buildStyles);
  const scale = useSharedValue(1);
  const { weekday, day: dayNum } = formatBookingDayCell(day);
  const isToday = day.isSame(dayjs(), 'day');

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
      accessibilityLabel={[
        day.locale('fr').format('dddd D MMMM'),
        isToday ? "aujourd'hui" : null,
        disabled ? 'indisponible' : null,
      ]
        .filter(Boolean)
        .join(', ')}
      accessibilityState={{ selected, disabled }}
      style={[
        animStyle,
        styles.cellOuter,
        { width, height },
        disabled && styles.cellOuterDisabled,
      ]}
    >
      {selected ? (
        <View style={[styles.cellInner, styles.cellInnerSelected]}>
          <AppText style={[styles.weekday, styles.textOn]} numberOfLines={1} adjustsFontSizeToFit>
            {weekday}
          </AppText>
          <AppText style={[styles.dayNum, styles.textOn]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
            {dayNum}
          </AppText>
        </View>
      ) : (
        <View
          style={[
            styles.cellInner,
            styles.cellInnerDefault,
            isToday && !disabled && styles.cellInnerToday,
          ]}
        >
          <AppText
            style={[styles.weekday, disabled && styles.textOff, isToday && !disabled && styles.weekdayToday]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {weekday}
          </AppText>
          <AppText
            style={[styles.dayNum, disabled && styles.textOff, isToday && !disabled && styles.dayNumToday]}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
          >
            {dayNum}
          </AppText>
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
  selectedDates,
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
  selectedDates?: string[];
  minLeadTimeHours: number;
  acceptSaturday: boolean;
  acceptSunday: boolean;
  onChange: (iso: string) => void;
}) {
  const styles = useStyles(buildStyles);
  const rows = [slide.slice(0, COLS), slide.slice(COLS, DAYS_PER_SLIDE)];

  return (
    <View style={[styles.slide, { width: slideWidth }]}>
      {rows.map((row, rowIdx) => (
        <Row key={rowIdx} gap={gap} style={{ marginBottom: rowIdx === 0 ? gap : 0 }}>
          {row.map((d) => {
            const iso = dateToIsoDay(d);
            const disabled = isBookingDayDisabled(d, minLeadTimeHours, {
              acceptSaturday,
              acceptSunday,
            });
            const picked = selectedDates
              ? selectedDates.some((day) => day.slice(0, 10) === iso)
              : (selected?.isSame(d, 'day') ?? false);
            return (
              <DayCell
                key={iso}
                day={d}
                selected={picked}
                disabled={disabled}
                width={cellWidth}
                height={cellHeight}
                onPress={() => onChange(iso)}
              />
            );
          })}
        </Row>
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
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const canPrev = page > 0;
  const canNext = page < pageCount - 1;

  return (
    <Row gap={spacing[2]} align="center">
      <Pressable
        onPress={onPrev}
        disabled={!canPrev}
        hitSlop={8}
        style={[styles.navBtn, !canPrev && styles.navBtnDisabled]}
        accessibilityRole="button"
        accessibilityLabel="Période précédente"
        accessibilityState={{ disabled: !canPrev }}
      >
        <ChevronLeft size={iconSize.md} color={canPrev ? c.primary : c.textTertiary} strokeWidth={ICON_STROKE_WIDTH} />
      </Pressable>

      <View style={styles.periodCenter}>
        <AppText style={styles.periodLabel}>
          {label}
        </AppText>
      </View>

      <Pressable
        onPress={onNext}
        disabled={!canNext}
        hitSlop={8}
        style={[styles.navBtn, !canNext && styles.navBtnDisabled]}
        accessibilityRole="button"
        accessibilityLabel="Période suivante"
        accessibilityState={{ disabled: !canNext }}
      >
        <ChevronRight size={iconSize.md} color={canNext ? c.primary : c.textTertiary} strokeWidth={ICON_STROKE_WIDTH} />
      </Pressable>
    </Row>
  );
}

/** 10 jours · 5×2 · swipe entre périodes. */
export function BookingDateCarousel({
  value,
  onChange,
  minLeadTimeHours = 0,
  acceptSaturday = true,
  acceptSunday = true,
  allowMultiple = false,
  selectionMode = 'single',
  onSelectionModeChange,
  selectedDates,
}: Props) {
  const styles = useStyles(buildStyles);
  const { fontSize } = useTheme();
  const listRef = useRef<FlatList<Dayjs[]>>(null);
  const [slideWidth, setSlideWidth] = useState(0);
  const [page, setPage] = useState(0);

  const slides = useMemo(
    () => buildBookingDaySlides(SLIDE_COUNT, DAYS_PER_SLIDE, minLeadTimeHours),
    [minLeadTimeHours],
  );

  const selected = parseIsoDay(value);
  const gap = spacing[1.5];
  const cellHeight = bookingDayCellHeight(fontSize);
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
    const day = parseIsoDay(value);
    if (!day || slideWidth <= 0) return;
    const idx = slideIndexForBookingDate(day, DAYS_PER_SLIDE, minLeadTimeHours);
    if (idx == null) return;
    scrollToPage(idx, false);
  }, [value, slideWidth, minLeadTimeHours, scrollToPage]);

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
        selectedDates={selectionMode === 'multiple' ? selectedDates : undefined}
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
      selectedDates,
      selectionMode,
      slideWidth,
    ],
  );

  return (
    <View style={styles.wrap}>
      {allowMultiple ? (
        <FullWidthSegmentBar
          accessibilityLabel="Nombre de dates"
          segments={[
            { id: 'single', label: 'Une date' },
            { id: 'multiple', label: 'Multiple' },
          ]}
          value={selectionMode === 'multiple' ? 'multiple' : 'single'}
          onChange={(mode) => onSelectionModeChange?.(mode)}
        />
      ) : null}
      <AppText variant="headline" accessibilityRole="header">Quel jour ?</AppText>

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
      </View>
    </View>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  const weekdaySize = fontSize['2xs'];
  const daySize = fontSize.base;

  return {
    wrap: { gap: spacing[2] },
    calendarCard: {
      gap: spacing[2.5],
      padding: spacing[3],
      borderRadius: radius.xl,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    navBtn: {
      width: 44,
      height: 44,
      borderRadius: radius.md,
      backgroundColor: c.surfaceAlt,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    navBtnDisabled: {
      opacity: 0.5,
    },
    periodCenter: {
      minWidth: 0,
      flex: 1,
      alignItems: 'center' as const,
      gap: 2,
    },
    periodLabel: {
      ...font.semiBold,
      fontSize: fontSize.sm,
      color: c.textPrimary,
      textAlign: 'center' as const,
    },
    sliderHost: {
      overflow: 'hidden' as const,
    },
    listContent: {
      paddingVertical: spacing[0.5],
    },
    slide: {
      paddingHorizontal: 0,
    },
    cellOuter: {
      borderRadius: radius.md,
      backgroundColor: 'transparent',
    },
    cellOuterDisabled: {
      opacity: 0.42,
    },
    cellInner: {
      minWidth: 0,
      flex: 1,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      paddingVertical: spacing[1.5],
      paddingHorizontal: spacing[0.5],
      gap: 2,
      borderRadius: radius.md,
    },
    cellInnerSelected: {
      backgroundColor: c.primary,
    },
    cellInnerDefault: {
      backgroundColor: c.surfaceAlt,
      borderWidth: 1,
      borderColor: c.borderLight,
    },
    cellInnerToday: {
      backgroundColor: c.surface,
      borderColor: c.primary,
      borderWidth: 1.5,
    },
    weekday: {
      ...font.semiBold,
      fontSize: weekdaySize,
      color: c.textTertiary,
      textTransform: 'capitalize' as const,
      letterSpacing: 0.2,
      lineHeight: lh(weekdaySize, 1.35),
    },
    weekdayToday: {
      color: c.primary,
    },
    dayNum: {
      ...font.bold,
      fontSize: daySize,
      color: c.textPrimary,
      lineHeight: lh(daySize, 1.22),
      fontVariant: ['tabular-nums' as const],
    },
    dayNumToday: {
      color: c.primary,
    },
    textOn: { color: '#0F172A' },
    textOff: { color: c.textTertiary },
  };
}

