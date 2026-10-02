import { useCallback, useMemo, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { formatBirthDateFr } from '@oneandlab/shared-utils';
import dayjs from 'dayjs';
import { SheetModal } from '@/components/ui/SheetModal';
import { Button } from '@/components/ui/Button';
import { radius, spacing, AppText, useStyles, font, type Theme } from '@/theme';
import { buildFieldStyles } from '@/components/ui/field-styles';

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
  const styles = useStyles(buildStyles);
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
      <AppText style={styles.label}>{label}</AppText>
      <Pressable
        onPress={openPicker}
        disabled={disabled}
        style={[styles.field, disabled && styles.fieldDisabled, error && styles.fieldError]}
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${display}`}
      >
        <AppText style={[styles.value, !parsedValid && styles.placeholder]}>{display}</AppText>
      </Pressable>
      {error ? <AppText style={styles.error}>{error}</AppText> : null}

      {androidOpen ? (
        <DateTimePicker
          value={parseValueToDate(value)}
          mode="date"
          display="default"
          maximumDate={maxDate}
          onChange={onAndroidChange}
        />
      ) : null}

      <SheetModal
        visible={iosOpen}
        onClose={() => setIosOpen(false)}
        title={label}
        disableScroll
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
      </SheetModal>
    </View>
  );
}

function buildStyles(theme: Theme) {
  const { colors: c, fontSize } = theme;
  const fieldStyles = buildFieldStyles(theme);
  return {
    wrap: { gap: spacing[1] },
    label: fieldStyles.label,
    field: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[3],
      backgroundColor: c.surface,
    },
    fieldDisabled: { opacity: 0.6 },
    fieldError: { borderColor: c.error },
    value: {
      ...font.regular,
      fontSize: fontSize.base,
      color: c.textPrimary,
    },
    placeholder: { color: c.textTertiary },
    error: {
      ...font.regular,
      fontSize: fontSize.xs,
      color: c.error,
      marginTop: spacing[0.5],
    },
    iosPicker: { alignSelf: 'stretch' as const },
  };
}
