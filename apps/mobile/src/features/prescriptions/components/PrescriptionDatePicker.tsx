import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useCallback, useMemo, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { formatBirthDateFr } from '@oneandlab/shared-utils';
import dayjs from 'dayjs';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  label?: string;
  value: string;
  onChange: (iso: string) => void;
  error?: string;
  disabled?: boolean;
}

function parseValueToDate(iso: string): Date {
  const parsed = dayjs(iso, 'YYYY-MM-DD', true);
  return parsed.isValid() ? parsed.toDate() : new Date();
}

export function PrescriptionDatePicker({
  label = 'Date de l’ordonnance',
  value,
  onChange,
  error,
  disabled,
}: Props) {
  const styles = useThemedStyles(buildStyles, 'PrescriptionDatePicker');
  const [iosOpen, setIosOpen] = useState(false);
  const [androidOpen, setAndroidOpen] = useState(false);
  /** État local du spinner iOS — ne pas resynchroniser via useEffect (boucle infinie). */
  const [pickerDate, setPickerDate] = useState(() => parseValueToDate(value));

  const maxDate = useMemo(() => new Date(), []);

  const parsedValid = useMemo(() => dayjs(value, 'YYYY-MM-DD', true).isValid(), [value]);
  const display = parsedValid && value ? formatBirthDateFr(value) : 'Choisir une date';

  const openPicker = useCallback(() => {
    if (disabled) return;
    setPickerDate(parseValueToDate(value));
    if (Platform.OS === 'android') {
      setAndroidOpen(true);
    } else {
      setIosOpen(true);
    }
  }, [disabled, value]);

  const onAndroidChange = useCallback(
    (event: DateTimePickerEvent, selected?: Date) => {
      setAndroidOpen(false);
      if (event.type === 'dismissed' || !selected) return;
      onChange(dayjs(selected).format('YYYY-MM-DD'));
    },
    [onChange],
  );

  const confirmIos = useCallback(() => {
    onChange(dayjs(pickerDate).format('YYYY-MM-DD'));
    setIosOpen(false);
  }, [onChange, pickerDate]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        onPress={openPicker}
        disabled={disabled}
        style={[styles.field, disabled && styles.fieldDisabled, error && styles.fieldError]}
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${display}`}
      >
        <Text style={[styles.value, !parsedValid && styles.placeholder]}>{display}</Text>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {androidOpen ? (
        <DateTimePicker
          value={parseValueToDate(value)}
          mode="date"
          display="default"
          maximumDate={maxDate}
          onChange={onAndroidChange}
        />
      ) : null}

      <BottomSheet
        visible={iosOpen}
        onClose={() => setIosOpen(false)}
        title={label}
        disableScroll
        snapPoints={['42%']}
        footer={<Button title="Confirmer" onPress={confirmIos} />}
      >
        <DateTimePicker
          value={pickerDate}
          mode="date"
          display="spinner"
          maximumDate={maxDate}
          locale="fr-FR"
          onChange={(_, selected) => {
            if (selected) setPickerDate(selected);
          }}
          style={styles.iosPicker}
        />
      </BottomSheet>
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
    wrap: { gap: spacing[1] },
    label: {
      fontFamily: fontFamily.medium,
      fontSize: fontSize.sm,
      color: c.textSecondary,
      marginBottom: spacing[0.5],
    },
    field: {
      borderWidth: 1,
      borderColor: c.borderLight,
      borderRadius: 12,
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[3],
      backgroundColor: c.surface,
    },
    fieldDisabled: { opacity: 0.6 },
    fieldError: { borderColor: c.error },
    value: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.base,
      color: c.textPrimary,
    },
    placeholder: { color: c.textTertiary },
    error: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.xs,
      color: c.error,
      marginTop: spacing[0.5],
    },
    iosPicker: { alignSelf: 'stretch' as const },
  };
}
