import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  BIRTH_MONTHS_FR,
  MIN_BIRTH_YEAR,
  buildBirthDateIso,
  formatBirthDateFr,
  parseBirthDateParts,
} from '@oneandlab/shared-utils';
import { Row } from '@/components/layout/primitives';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

type PickerField = 'day' | 'month' | 'year' | null;

interface Props {
  label?: string;
  value: string;
  onChange: (iso: string) => void;
  error?: string;
  disabled?: boolean;
}

export function BirthDatePicker({
  label = 'Date de naissance',
  value,
  onChange,
  error,
  disabled,
}: Props) {
  const styles = useThemedStyles(buildStyles, 'components_ui_BirthDatePicker_tsx_styles');
  const [day, setDay] = useState<number | null>(null);
  const [month, setMonth] = useState<number | null>(null);
  const [year, setYear] = useState<number | null>(null);
  const [picker, setPicker] = useState<PickerField>(null);

  useEffect(() => {
    const parts = parseBirthDateParts(value);
    if (parts) {
      setDay(parts.day);
      setMonth(parts.month);
      setYear(parts.year);
    } else if (!value) {
      setDay(null);
      setMonth(null);
      setYear(null);
    }
  }, [value]);

  const emit = (d: number | null, m: number | null, y: number | null) => {
    if (d && m && y) {
      const iso = buildBirthDateIso(y, m, d);
      onChange(iso ?? '');
    } else {
      onChange('');
    }
  };

  const currentYear = new Date().getFullYear();
  const dayOptions = useMemo(() => Array.from({ length: 31 }, (_, i) => i + 1), []);
  const yearOptions = useMemo(
    () =>
      Array.from({ length: currentYear - MIN_BIRTH_YEAR + 1 }, (_, i) => currentYear - i).filter(
        (y) => y >= MIN_BIRTH_YEAR,
      ),
    [currentYear],
  );

  const dayLabel = day ? String(day) : 'Jour';
  const monthLabel = month
    ? (BIRTH_MONTHS_FR.find((m) => m.value === month)?.label ?? String(month))
    : 'Mois';
  const yearLabel = year ? String(year) : 'Année';

  const summary = value ? formatBirthDateFr(value) : null;

  const pickerTitle =
    picker === 'day' ? 'Jour' : picker === 'month' ? 'Mois' : picker === 'year' ? 'Année' : '';

  const pickerItems: { key: string; label: string; value: number }[] =
    picker === 'day'
      ? dayOptions.map((d) => ({ key: `d-${d}`, label: String(d), value: d }))
      : picker === 'month'
        ? BIRTH_MONTHS_FR.map((m) => ({
            key: `m-${m.value}`,
            label: m.label,
            value: m.value,
          }))
        : picker === 'year'
          ? yearOptions.map((y) => ({ key: `y-${y}`, label: String(y), value: y }))
          : [];

  const onPick = (v: number) => {
    if (picker === 'day') {
      setDay(v);
      emit(v, month, year);
    } else if (picker === 'month') {
      setMonth(v);
      emit(day, v, year);
    } else if (picker === 'year') {
      setYear(v);
      emit(day, month, v);
    }
    setPicker(null);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <Row gap={spacing[2]} style={styles.row}>
        {(['day', 'month', 'year'] as const).map((field) => {
          const text =
            field === 'day' ? dayLabel : field === 'month' ? monthLabel : yearLabel;
          const filled =
            field === 'day' ? day != null : field === 'month' ? month != null : year != null;
          return (
            <Pressable
              key={field}
              disabled={disabled}
              onPress={() => setPicker(field)}
              style={[styles.field, filled && styles.fieldFilled, disabled && styles.fieldDisabled]}
            >
              <Text style={[styles.fieldText, filled && styles.fieldTextFilled]}>{text}</Text>
            </Pressable>
          );
        })}
      </Row>
      {summary ? <Text style={styles.summary}>{summary}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <BottomSheet
        visible={picker != null}
        onClose={() => setPicker(null)}
        title={pickerTitle}
      >
        <View style={styles.list}>
          {pickerItems.map((item) => (
            <Pressable key={item.key} onPress={() => onPick(item.value)} style={styles.listItem}>
              <Text style={styles.listItemText}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      </BottomSheet>
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
  row: {
    minWidth: 0,
  },
  field: {
    minWidth: 0,
    flex: 1,
    minHeight: 48,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
    paddingHorizontal: spacing[2],
  },
  fieldFilled: {
    borderColor: c.primary,
    backgroundColor: c.primaryLight,
  },
  fieldDisabled: { opacity: 0.5 },
  fieldText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: c.textSecondary,
  },
  fieldTextFilled: {
    color: c.textPrimary,
    fontFamily: fontFamily.semiBold,
  },
  summary: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: c.textSecondary,
  },
  error: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: c.error,
  },
  list: { gap: spacing[1] },
  listItem: {
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[2],
    borderRadius: radius.md,
  },
  listItemText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.base,
    color: c.textPrimary,
  },
};
}

