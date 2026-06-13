import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { formatBirthDateFr } from '@oneandlab/shared-utils';
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

export function PrescriptionDatePicker({
  label = 'Date de l’ordonnance',
  value,
  onChange,
  error,
  disabled,
}: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'PrescriptionDatePicker');
  const [iosOpen, setIosOpen] = useState(false);
  const [androidOpen, setAndroidOpen] = useState(false);
  const [pickerDate, setPickerDate] = useState(() => new Date());

  const parsed = dayjs(value, 'YYYY-MM-DD', true);
  const dateValue = useMemo(
    () => (parsed.isValid() ? parsed.toDate() : new Date()),
    [parsed],
  );

  useEffect(() => {
    if (iosOpen) setPickerDate(dateValue);
  }, [iosOpen, dateValue]);

  const display = value && parsed.isValid() ? formatBirthDateFr(value) : 'Choisir une date';

  const applyDate = (selected?: Date) => {
    if (!selected) return;
    onChange(dayjs(selected).format('YYYY-MM-DD'));
  };

  const onAndroidChange = (event: DateTimePickerEvent, selected?: Date) => {
    setAndroidOpen(false);
    if (event.type === 'dismissed') return;
    applyDate(selected);
  };

  const openPicker = () => {
    if (disabled) return;
    if (Platform.OS === 'android') {
      setAndroidOpen(true);
    } else {
      setIosOpen(true);
    }
  };

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
        <Text style={[styles.value, !value && styles.placeholder]}>{display}</Text>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {androidOpen ? (
        <DateTimePicker
          value={dateValue}
          mode="date"
          display="default"
          maximumDate={new Date()}
          onChange={onAndroidChange}
        />
      ) : null}

      <BottomSheet
        visible={iosOpen}
        onClose={() => setIosOpen(false)}
        title={label}
        disableScroll
        snapPoints={['42%']}
        footer={
          <Button
            title="Confirmer"
            onPress={() => {
              onChange(dayjs(pickerDate).format('YYYY-MM-DD'));
              setIosOpen(false);
            }}
          />
        }
      >
        <DateTimePicker
          value={dateValue}
          mode="date"
          display="spinner"
          maximumDate={new Date()}
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
