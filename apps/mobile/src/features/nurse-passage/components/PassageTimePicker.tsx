import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useCallback, useMemo, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { useInBottomSheet } from '@/components/ui/sheet-keyboard-context';
import { spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

type Props = {
  label?: string;
  value: string;
  onChange: (hhmm: string) => void;
  disabled?: boolean;
};

function parseTimeToDate(hhmm: string): Date {
  const parsed = dayjs(`1970-01-01T${hhmm}`, 'YYYY-MM-DDTHH:mm', true);
  return parsed.isValid() ? parsed.toDate() : dayjs('1970-01-01T09:00').toDate();
}

export function PassageTimePicker({ label = 'Heure', value, onChange, disabled }: Props) {
  const styles = useThemedStyles(buildStyles, 'PassageTimePicker');
  const inSheet = useInBottomSheet();
  const [iosOpen, setIosOpen] = useState(false);
  const [inlineOpen, setInlineOpen] = useState(false);
  const [androidOpen, setAndroidOpen] = useState(false);
  const [pickerDate, setPickerDate] = useState(() => parseTimeToDate(value));

  const display = useMemo(() => {
    const parsed = dayjs(`1970-01-01T${value}`, 'YYYY-MM-DDTHH:mm', true);
    return parsed.isValid() ? parsed.format('HH:mm') : 'Choisir une heure';
  }, [value]);

  const expanded = inSheet ? inlineOpen : iosOpen;

  const openPicker = useCallback(() => {
    if (disabled) return;
    setPickerDate(parseTimeToDate(value));
    if (Platform.OS === 'android') {
      setAndroidOpen(true);
      return;
    }
    if (inSheet) {
      setInlineOpen((v) => !v);
    } else {
      setIosOpen(true);
    }
  }, [disabled, inSheet, value]);

  const emitTime = useCallback(
    (date: Date) => {
      onChange(dayjs(date).format('HH:mm'));
    },
    [onChange],
  );

  const onAndroidChange = useCallback(
    (event: DateTimePickerEvent, selected?: Date) => {
      setAndroidOpen(false);
      if (event.type === 'dismissed' || !selected) return;
      emitTime(selected);
      setInlineOpen(false);
    },
    [emitTime],
  );

  const confirmIos = useCallback(() => {
    emitTime(pickerDate);
    setIosOpen(false);
    setInlineOpen(false);
  }, [emitTime, pickerDate]);

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable
        onPress={openPicker}
        disabled={disabled}
        style={[styles.field, disabled && styles.fieldDisabled, expanded && styles.fieldOpen]}
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${display}`}
        accessibilityState={{ expanded }}
      >
        <Text style={styles.value}>{display}</Text>
      </Pressable>

      {androidOpen ? (
        <DateTimePicker
          value={parseTimeToDate(value)}
          mode="time"
          is24Hour
          display="default"
          onChange={onAndroidChange}
        />
      ) : null}

      {inSheet && inlineOpen && Platform.OS === 'ios' ? (
        <View style={styles.inlinePanel}>
          <DateTimePicker
            value={pickerDate}
            mode="time"
            is24Hour
            display="spinner"
            locale="fr-FR"
            onChange={(_, selected) => {
              if (selected) setPickerDate(selected);
            }}
            style={styles.iosPicker}
          />
          <Button title="Confirmer" size="sm" onPress={confirmIos} />
        </View>
      ) : null}

      {!inSheet && iosOpen ? (
        <BottomSheet
          visible={iosOpen}
          onClose={() => setIosOpen(false)}
          title={label}
          disableScroll
          snapPoints={['42%']}
          stackBehavior="push"
          footer={<Button title="Confirmer" onPress={confirmIos} />}
        >
          <DateTimePicker
            value={pickerDate}
            mode="time"
            is24Hour
            display="spinner"
            locale="fr-FR"
            onChange={(_, selected) => {
              if (selected) setPickerDate(selected);
            }}
            style={styles.iosPicker}
          />
        </BottomSheet>
      ) : null}
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
    wrap: { gap: spacing[1], marginTop: spacing[2] },
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
    fieldOpen: {
      borderColor: c.primary,
    },
    fieldDisabled: { opacity: 0.6 },
    value: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.base,
      color: c.textPrimary,
    },
    inlinePanel: {
      gap: spacing[2],
      paddingTop: spacing[1],
    },
    iosPicker: { alignSelf: 'stretch' as const },
  };
}
