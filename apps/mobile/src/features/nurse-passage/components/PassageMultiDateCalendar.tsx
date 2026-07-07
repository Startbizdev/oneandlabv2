import { layoutRowWrap } from '@/theme/layout-styles';
import type { AppColors } from '@/theme/colors';
import { hexToRgba } from '@/theme/color-utils';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Row } from '@/components/layout/primitives';
import { radius, spacing, iconSize, AppText, useLayoutMetrics, calendarCellMaxWidth } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

dayjs.locale('fr');

type Props = {
  selected: string[];
  onChange: (dates: string[]) => void;
};

export function PassageMultiDateCalendar({ selected, onChange }: Props) {
  const c = useAppColors();
  const layout = useLayoutMetrics();
  const styles = useThemedStyles(buildStyles);
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
          hitSlop={8}
          accessibilityLabel="Mois précédent"
        >
          <ChevronLeft size={iconSize.mdLg} color={c.textSecondary} />
        </Pressable>
        <AppText style={[styles.monthLabel, { color: c.textPrimary }]}>
          {cursor.format('MMMM YYYY')}
        </AppText>
        <Pressable
          onPress={() => setCursor((m) => m.add(1, 'month'))}
          hitSlop={8}
          accessibilityLabel="Mois suivant"
        >
          <ChevronRight size={iconSize.mdLg} color={c.textSecondary} />
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
          if (!cell.iso || cell.day == null) {
            return <View key={`empty-${idx}`} style={[styles.cell, { maxWidth: cellMaxWidth }]} />;
          }
          const on = selectedSet.has(cell.iso);
          return (
            <Pressable
              key={cell.iso}
              onPress={() => toggle(cell.iso!)}
              style={[
                styles.cell,
                styles.dayCell,
                { maxWidth: cellMaxWidth },
                on && { backgroundColor: hexToRgba(c.primary, 0.15), borderColor: c.primary },
              ]}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={dayjs(cell.iso).format('D MMMM YYYY')}
            >
              <AppText
                style={{
                  fontFamily: fontFamily.semiBold,
                  fontSize: fontSize.sm,
                  color: on ? c.primaryDark : c.textPrimary,
                }}
              >
                {cell.day}
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
          <AppText style={[styles.summaryDates, { color: c.textPrimary }]} numberOfLines={3}>
            {sortedSelected.map((d) => dayjs(d).format('D MMM')).join(' · ')}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

function buildStyles(_c: AppColors) {
  return {
    wrap: { gap: spacing[2] },
    header: { marginBottom: spacing[1] },
    monthLabel: {
      fontFamily: fontFamily.bold,
      fontSize: fontSize.md,
      textTransform: 'capitalize' as const,
    },
    weekdayRow: { justifyContent: 'space-between' as const },
    weekday: {
      width: 36,
      textAlign: 'center' as const,
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.xs,
    },
    grid: {
      ...layoutRowWrap(0),
    },
    cell: {
      width: '14.28%' as unknown as number,
      aspectRatio: 1,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    dayCell: {
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    summary: { marginTop: spacing[1], gap: spacing[0.5] },
    summaryLabel: { fontFamily: fontFamily.medium, fontSize: fontSize.xs },
    summaryDates: { fontFamily: fontFamily.regular, fontSize: fontSize.sm },
  };
}
