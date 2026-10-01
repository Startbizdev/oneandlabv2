import { layoutRowCenter } from '@/theme/layout-styles';
import { useAppColors } from '@/theme/use-app-colors';
import dayjs from 'dayjs';
import { useEffect, useMemo, useRef } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { MiniDateCalendar, miniDateCalendarOuterSize } from '@/components/ui/MiniDateCalendar';
import { formatMiniDateCalendarParts } from '@/utils/mini-date-calendar-parts';
import { formatCountBadge } from '@/components/navigation/CountBadge';
import { ICON_STROKE_WIDTH, H_PADDING, elevation, radius, spacing, iconSize, AppText, useStyles, font, type Theme } from '@/theme';
import { hexToRgba } from '@/theme/color-utils';

type Props = {
  selectedDate: string;
  dayCounts: Record<string, number>;
  onSelectDate: (date: string) => void;
  embedded?: boolean;
};

const FORWARD_DAYS = 21;
const CALENDAR_SIZE = 'xs' as const;
const CALENDAR_PX = miniDateCalendarOuterSize(CALENDAR_SIZE);
const CELL_GAP = spacing[2];

type DayCellProps = {
  iso: string;
  active: boolean;
  isToday: boolean;
  count: number;
  onPress: () => void;
};

function TourDayCell({ iso, active, isToday, count, onPress }: DayCellProps) {
  const c = useAppColors();
  const styles = useStyles(buildCellStyles);
  const a11y = formatMiniDateCalendarParts(iso)?.accessibilityLabel ?? iso;
  /** Primary uniquement sur le jour sélectionné — aujourd'hui redevient neutre si non actif. */
  const variant = active ? 'brand' : 'neutral';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={
        count > 0 ? `${a11y}, ${count} passage${count > 1 ? 's' : ''}` : a11y
      }
      style={({ pressed }) => [
        styles.cell,
        active && [styles.cellSelected, { borderColor: c.primary }],
        isToday && !active && [styles.cellTodayHint, { borderColor: c.primaryMid }],
        pressed && styles.cellPressed,
      ]}
    >
      <View style={styles.calendarWrap}>
        <MiniDateCalendar date={iso} size={CALENDAR_SIZE} variant={variant} accessibilityHidden />
        {count > 0 ? (
          <View
            style={[
              styles.countBadge,
              count >= 10 && styles.countBadgeWide,
              { backgroundColor: c.primary, borderColor: c.surface },
            ]}
          >
            <AppText style={[styles.countText, { color: c.textInverse }]} maxFontSizeMultiplier={1.2}>
              {formatCountBadge(count)}
            </AppText>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

export function TourDayStrip({ selectedDate, dayCounts, onSelectDate, embedded = false }: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const scrollRef = useRef<ScrollView>(null);
  const today = useMemo(() => dayjs().startOf('day'), []);
  const todayIso = today.format('YYYY-MM-DD');
  const cellStride = CALENDAR_PX + CELL_GAP;

  const days = useMemo(() => {
    const selected = dayjs(selectedDate).startOf('day');
    const start = selected.isBefore(today, 'day') ? selected : today;
    const end = today.add(FORWARD_DAYS, 'day');
    const out: string[] = [];
    for (let d = start; d.isBefore(end) || d.isSame(end, 'day'); d = d.add(1, 'day')) {
      out.push(d.format('YYYY-MM-DD'));
    }
    return out;
  }, [selectedDate, today]);

  const todayIndex = days.indexOf(todayIso);
  const selectedIndex = days.indexOf(selectedDate);

  useEffect(() => {
    const targetIndex = selectedIndex >= 0 ? selectedIndex : todayIndex;
    if (targetIndex < 0) return;
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        x: Math.max(0, targetIndex * cellStride),
        animated: true,
      });
    });
  }, [selectedDate, todayIndex, selectedIndex, cellStride]);

  const shift = (delta: number) => {
    onSelectDate(dayjs(selectedDate).add(delta, 'day').format('YYYY-MM-DD'));
  };

  return (
    <View style={[styles.bar, embedded ? styles.barEmbedded : styles.barStandalone]}>
      <Pressable
        onPress={() => shift(-1)}
        hitSlop={12}
        accessibilityLabel="Jour précédent"
        style={({ pressed }) => [
          styles.navBtn,
          { backgroundColor: c.surfaceAlt, borderColor: c.borderLight },
          pressed && styles.navBtnPressed,
        ]}
      >
        <ChevronLeft size={iconSize.md} color={c.textSecondary} strokeWidth={ICON_STROKE_WIDTH} />
      </Pressable>

      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scrollView}
        contentContainerStyle={styles.scroll}
      >
        {days.map((d) => (
          <TourDayCell
            key={d}
            iso={d}
            active={d === selectedDate}
            isToday={dayjs(d).isSame(today, 'day')}
            count={dayCounts[d] ?? 0}
            onPress={() => onSelectDate(d)}
          />
        ))}
      </ScrollView>

      <Pressable
        onPress={() => shift(1)}
        hitSlop={12}
        accessibilityLabel="Jour suivant"
        style={({ pressed }) => [
          styles.navBtn,
          { backgroundColor: c.surfaceAlt, borderColor: c.borderLight },
          pressed && styles.navBtnPressed,
        ]}
      >
        <ChevronRight size={iconSize.md} color={c.textSecondary} strokeWidth={ICON_STROKE_WIDTH} />
      </Pressable>
    </View>
  );
}

function buildStyles() {
  return {
    bar: {
      ...layoutRowCenter(spacing[1]),
    },
    barEmbedded: { marginBottom: 0 },
    barStandalone: {
      marginHorizontal: H_PADDING,
      marginBottom: spacing[3],
    },
    navBtn: {
      width: spacing[9],
      height: spacing[9],
      flexShrink: 0,
      borderRadius: radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    navBtnPressed: { opacity: 0.65 },
    scrollView: {
      flex: 1,
      minWidth: 0,
    },
    scroll: {
      gap: CELL_GAP,
      paddingVertical: spacing[1.5],
      paddingHorizontal: spacing[0.5],
      alignItems: 'center' as const,
    },
  };
}

function buildCellStyles({ colors: c, fontSize }: Theme) {
  return {
    cell: {
      width: CALENDAR_PX + spacing[1],
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      borderRadius: radius.lg,
      borderWidth: 2,
      borderColor: 'transparent',
      padding: spacing[0.5],
    },
    /** Jour sélectionné — calendrier brand + anneau primary. */
    cellSelected: {
      backgroundColor: hexToRgba(c.primary, 0.07),
      ...elevation.sm,
      transform: [{ scale: 1.02 }],
    },
    /** Aujourd'hui non sélectionné — repère discret sans primary. */
    cellTodayHint: {
      borderWidth: 1,
    },
    cellPressed: { opacity: 0.88, transform: [{ scale: 0.97 }] },
    calendarWrap: {
      width: CALENDAR_PX,
      position: 'relative' as const,
    },
    /** Pastille coin haut-droit — alignement identique aux badges header. */
    countBadge: {
      position: 'absolute' as const,
      top: -5,
      right: -5,
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      paddingHorizontal: 4,
      borderWidth: 2,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      zIndex: 2,
      overflow: 'hidden' as const,
      ...elevation.xs,
    },
    countBadgeWide: {
      minWidth: 22,
      paddingHorizontal: 5,
    },
    countText: {
      ...font.extraBold,
      fontSize: fontSize['2xs'],
      lineHeight: 12,
      textAlign: 'center' as const,
      includeFontPadding: false,
      ...Platform.select({
        android: {
          textAlignVertical: 'center' as const,
          height: 12,
          transform: [{ translateY: -0.5 }],
        },
        ios: {
          transform: [{ translateY: -0.5 }],
        },
      }),
    },
  };
}
