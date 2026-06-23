import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import {
  buildBirthDateIso,
  formatBirthDateFr,
  parseBirthDateParts,
} from '@oneandlab/shared-utils';
import { Row } from '@/components/layout/primitives';
import { Input } from '@/components/ui/Input';
import { spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  label?: string;
  value: string;
  onChange: (iso: string) => void;
  error?: string;
  disabled?: boolean;
}

function digitsOnly(raw: string, maxLen: number): string {
  return raw.replace(/\D/g, '').slice(0, maxLen);
}

export function BirthDatePicker({
  label = 'Date de naissance',
  value,
  onChange,
  error,
  disabled,
}: Props) {
  const styles = useThemedStyles(buildStyles, 'components_ui_BirthDatePicker_tsx_styles');
  const [dayText, setDayText] = useState('');
  const [monthText, setMonthText] = useState('');
  const [yearText, setYearText] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    const parts = parseBirthDateParts(value);
    if (parts) {
      setDayText(String(parts.day));
      setMonthText(String(parts.month));
      setYearText(String(parts.year));
      setLocalError(null);
    } else if (!value) {
      setDayText('');
      setMonthText('');
      setYearText('');
      setLocalError(null);
    }
  }, [value]);

  const emitFromParts = useCallback(
    (d: string, m: string, y: string) => {
      const day = d.trim();
      const month = m.trim();
      const year = y.trim();

      if (!day && !month && !year) {
        setLocalError(null);
        onChange('');
        return;
      }

      if (!day || !month || year.length < 4) {
        setLocalError(null);
        onChange('');
        return;
      }

      const iso = buildBirthDateIso(Number(year), Number(month), Number(day));
      if (!iso) {
        setLocalError('Date invalide');
        onChange('');
        return;
      }

      setLocalError(null);
      onChange(iso);
    },
    [onChange],
  );

  const onDayChange = (text: string) => {
    const next = digitsOnly(text, 2);
    setDayText(next);
    emitFromParts(next, monthText, yearText);
  };

  const onMonthChange = (text: string) => {
    const next = digitsOnly(text, 2);
    setMonthText(next);
    emitFromParts(dayText, next, yearText);
  };

  const onYearChange = (text: string) => {
    const next = digitsOnly(text, 4);
    setYearText(next);
    emitFromParts(dayText, monthText, next);
  };

  const summary = value ? formatBirthDateFr(value) : null;
  const displayError = error ?? localError ?? undefined;

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <Row gap={spacing[2]} style={styles.row}>
        <View style={styles.field}>
          <Input
            label="Jour"
            value={dayText}
            onChangeText={onDayChange}
            keyboardType="number-pad"
            placeholder="JJ"
            maxLength={2}
            editable={!disabled}
            accessibilityLabel="Jour de naissance"
          />
        </View>
        <View style={styles.field}>
          <Input
            label="Mois"
            value={monthText}
            onChangeText={onMonthChange}
            keyboardType="number-pad"
            placeholder="MM"
            maxLength={2}
            editable={!disabled}
            accessibilityLabel="Mois de naissance"
          />
        </View>
        <View style={styles.fieldYear}>
          <Input
            label="Année"
            value={yearText}
            onChangeText={onYearChange}
            keyboardType="number-pad"
            placeholder="AAAA"
            maxLength={4}
            editable={!disabled}
            accessibilityLabel="Année de naissance"
          />
        </View>
      </Row>
      {summary ? <Text style={styles.summary}>{summary}</Text> : null}
      {displayError ? <Text style={styles.error}>{displayError}</Text> : null}
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
    },
    fieldYear: {
      minWidth: 0,
      flex: 1.35,
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
  };
}
