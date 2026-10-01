import { layoutRowWrap } from '@/theme/layout-styles';
import { hexToRgba } from '@/theme/color-utils';
import { useAppColors } from '@/theme/use-app-colors';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Row } from '@/components/layout/primitives';
import { ICON_STROKE_WIDTH, radius, spacing, iconSize, AppText, useLayoutMetrics, calendarCellMaxWidth, useStyles, font, type Theme } from '@/theme';
dayjs.locale('fr');

type Props = {
  selected: string[];
  onChange: (dates: string[]) => void;
};

export function PassageMultiDateCalendar({ selected, onChange }: Props) {
  const c = useAppColors();
  const layout = useLayoutMetrics();
  const styles = useStyles(buildStyles);
  const cellMaxWidth = calendarCellMaxWidth(layout.width);
  const [cursor, setCursor] = useState(() => dayjs().startOf('month'));

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const grid = useMemo(() => {
    const start = cursor.startOf('month');
    const daysInMonth = start.daysInMonth();
    const firstDow = (start.day() + 6) % 7;
    const cells: Array<{ iso: string | null; day: number | null }> = [];
    for (let i = 0; i < firstDow; i++) cells.push({ iso: null, day: null });
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = start.date(d).format('YYYY-MM-DD');
      cells.push({ iso, day: d });
    }
    return cells;
  }, [cursor]);

  const toggle = (iso: string) => {
    const next = new Set(selected);
    if (next.has(iso)) next.delete(iso);
    else next.add(iso);
    onChange([...next].sort());
  };

  const sortedSelected = useMemo(() => [...selected].sort(), [selected]);

  return (
    <View style={styles.wrap}>
      <Row justify="between" align="center" style={styles.header}>
        <Pressable
          onPress={() => setCursor((m) => m.subtract(1, 'month'))}
          hitSlop={10}
          accessibilityLabel="Mois précédent"
        >
          <ChevronLeft size={iconSize.lg} color={c.textSecondary} strokeWidth={ICON_STROKE_WIDTH} />
        </Pressable>
        <AppText style={[styles.monthLabel, { color: c.textPrimary }]}>
          {cursor.format('MMMM YYYY')}
        </AppText>
        <Pressable
          onPress={() => setCursor((m) => m.add(1, 'month'))}
          hitSlop={10}
          accessibilityLabel="Mois suivant"
        >
          <ChevronRight size={iconSize.lg} color={c.textSecondary} strokeWidth={ICON_STROKE_WIDTH} />
        </Pressable>
      </Row>

      <Row style={styles.weekdayRow}>
        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((w, i) => (
          <AppText key={`${w}-${i}`} style={[styles.weekday, { color: c.textTertiary }]}>
            {w}
          </AppText>
        ))}
      </Row>

      <View style={styles.grid}>
        {grid.map((cell, idx) => {
          const { iso, day } = cell;
          if (!iso || day == null) {
            return <View key={`empty-${idx}`} style={[styles.cell, { maxWidth: cellMaxWidth }]} />;
          }
          const on = selectedSet.has(iso);
          return (
            <Pressable
              key={iso}
              onPress={() => toggle(iso)}
              style={[
                styles.cell,
                styles.dayCell,
                { maxWidth: cellMaxWidth },
                on && { backgroundColor: hexToRgba(c.primary, 0.15), borderColor: c.primary },
              ]}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={dayjs(iso).format('D MMMM YYYY')}
            >
              <AppText style={[styles.dayLabel, { color: on ? c.primaryDark : c.textPrimary }]}>
                {day}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      {sortedSelected.length > 0 ? (
        <View style={styles.summary}>
          <AppText style={[styles.summaryLabel, { color: c.textSecondary }]}>
            {sortedSelected.length} date{sortedSelected.length > 1 ? 's' : ''} sélectionnée
            {sortedSelected.length > 1 ? 's' : ''}
          </AppText>
          <AppText style={[styles.summaryDates, { color: c.textPrimary }]}>
            {sortedSelected.map((d) => dayjs(d).format('D MMM')).join(' · ')}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

function buildStyles({ fontSize }: Theme) {
  return {
    wrap: { gap: spacing[2] },
    header: { marginBottom: spacing[1] },
    monthLabel: {
      ...font.bold,
      fontSize: fontSize.md,
      textTransform: 'capitalize' as const,
    },
    weekdayRow: { justifyContent: 'space-between' as const },
    weekday: {
      width: spacing[9],
      textAlign: 'center' as const,
      ...font.semiBold,
      fontSize: fontSize.xs,
    },
    grid: {
      ...layoutRowWrap(0),
    },
    cell: {
      width: '14.28%' as const,
      aspectRatio: 1,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    dayCell: {
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    dayLabel: { ...font.semiBold, fontSize: fontSize.sm },
    summary: { marginTop: spacing[1], gap: spacing[0.5] },
    summaryLabel: { ...font.medium, fontSize: fontSize.xs },
    summaryDates: { ...font.regular, fontSize: fontSize.sm },
  };
}
