import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { formatBirthDateFr } from '@oneandlab/shared-utils';
import dayjs from 'dayjs';
import { SheetModal } from '@/components/ui/SheetModal';
import { Button } from '@/components/ui/Button';
import { useInBottomSheet } from '@/components/ui/sheet-keyboard-context';
import { useScrollFocusedFieldIntoView } from '@/components/layout/form-scroll-context';
import { radius, spacing, AppText, useStyles, font, type Theme } from '@/theme';
import { buildFieldStyles } from '@/components/ui/field-styles';

type Props = {
  label?: string;
  value: string;
  onChange: (iso: string) => void;
  error?: string;
  disabled?: boolean;
  minimumDate?: Date;
  maximumDate?: Date;
  placeholder?: string;
};

function parseValueToDate(iso: string): Date {
  const parsed = dayjs(iso, 'YYYY-MM-DD', true);
  return parsed.isValid() ? parsed.toDate() : new Date();
}

export function IsoDatePicker({
  label,
  value,
  onChange,
  error,
  disabled,
  minimumDate,
  maximumDate,
  placeholder = 'Choisir une date',
}: Props) {
  const styles = useStyles(buildStyles);
  const inSheet = useInBottomSheet();
  const [iosOpen, setIosOpen] = useState(false);
  const [inlineOpen, setInlineOpen] = useState(false);
  const [androidOpen, setAndroidOpen] = useState(false);
  const [pickerDate, setPickerDate] = useState(() => parseValueToDate(value));
  const wrapRef = useRef<View>(null);
  const scrollIntoView = useScrollFocusedFieldIntoView();

  /** Roue ouverte dans la sheet : remonter le champ en haut de la zone visible, sinon elle s'ouvre sous le pied fixe. */
  useEffect(() => {
    if (inSheet && inlineOpen) scrollIntoView(wrapRef);
  }, [inSheet, inlineOpen, scrollIntoView]);

  const parsedValid = useMemo(() => dayjs(value, 'YYYY-MM-DD', true).isValid(), [value]);
  const display = parsedValid && value ? formatBirthDateFr(value) : placeholder;
  const expanded = inSheet ? inlineOpen : iosOpen;

  const openPicker = useCallback(() => {
    if (disabled) return;
    setPickerDate(parseValueToDate(value));
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
    setInlineOpen(false);
  }, [onChange, pickerDate]);

  return (
    <View ref={wrapRef} collapsable={false} style={styles.wrap}>
      {label ? (
        <AppText style={styles.label} numberOfLines={1}>
          {label}
        </AppText>
      ) : null}
      <Pressable
        onPress={openPicker}
        disabled={disabled}
        style={[
          styles.field,
          disabled && styles.fieldDisabled,
          error && styles.fieldError,
          expanded && styles.fieldOpen,
        ]}
        accessibilityRole="button"
        accessibilityLabel={label ? `${label}, ${display}` : display}
        accessibilityState={{ expanded }}
      >
        <AppText
          style={[styles.value, !parsedValid && styles.placeholder]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.85}
        >
          {display}
        </AppText>
      </Pressable>
      {error ? <AppText style={styles.error}>{error}</AppText> : null}

      {androidOpen ? (
        <DateTimePicker
          value={parseValueToDate(value)}
          mode="date"
          display="default"
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={onAndroidChange}
        />
      ) : null}

      {inSheet && inlineOpen && Platform.OS === 'ios' ? (
        <View style={styles.inlinePanel}>
          <DateTimePicker
            value={pickerDate}
            mode="date"
            display="spinner"
            minimumDate={minimumDate}
            maximumDate={maximumDate}
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
        <SheetModal
          visible={iosOpen}
          onClose={() => setIosOpen(false)}
          title={label ?? 'Date'}
          footer={<Button title="Confirmer" onPress={confirmIos} />}
        >
          <DateTimePicker
            value={pickerDate}
            mode="date"
            display="spinner"
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            locale="fr-FR"
            onChange={(_, selected) => {
              if (selected) setPickerDate(selected);
            }}
            style={styles.iosPicker}
          />
        </SheetModal>
      ) : null}
    </View>
  );
}

function buildStyles(theme: Theme) {
  const { colors: c, fontSize } = theme;
  const fieldStyles = buildFieldStyles(theme);
  return {
    wrap: { gap: spacing[1], minWidth: 0 },
    label: fieldStyles.label,
    field: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[3],
      backgroundColor: c.surface,
      minWidth: 0,
      overflow: 'hidden' as const,
    },
    fieldOpen: {
      borderColor: c.primary,
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
    inlinePanel: {
      gap: spacing[2],
      paddingTop: spacing[1],
    },
    iosPicker: { alignSelf: 'stretch' as const },
  };
}
