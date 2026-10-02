import { useAppColors } from '@/theme/use-app-colors';

import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Row } from '@/components/layout/primitives';
import { ChevronDown } from 'lucide-react-native';
import { SheetModal } from './SheetModal';
import { useInBottomSheet } from './sheet-keyboard-context';
import { radius, spacing, iconSize, AppText, useStyles, font, ICON_STROKE_WIDTH, type Theme } from '@/theme';
import { buildFieldStyles, FIELD_MIN_HEIGHT } from './field-styles';

export type SelectOption = { value: string; label: string };

interface Props {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  sheetTitle?: string;
  /** Masque le libellé au-dessus du champ (ex. sélecteurs Heure / Minutes côte à côte). */
  hideLabel?: boolean;
}

export function SelectField({
  label,
  value,
  options,
  onChange,
  placeholder = 'Choisir…',
  error,
  sheetTitle,
  hideLabel = false,
}: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const field = useStyles(buildFieldStyles);
  const inSheet = useInBottomSheet();
  const [open, setOpen] = useState(false);
  const selectedLabel = useMemo(
    () => options.find((o) => o.value === value)?.label,
    [options, value],
  );

  function selectOption(next: string) {
    onChange(next);
    setOpen(false);
  }

  const optionItems = options.map((opt) => {
    const active = opt.value === value;
    return (
      <Pressable
        key={opt.value}
        onPress={() => selectOption(opt.value)}
        style={[styles.item, active && styles.itemActive]}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        accessibilityLabel={opt.label}
      >
        <AppText style={[styles.itemText, active && styles.itemTextActive]}>{opt.label}</AppText>
      </Pressable>
    );
  });

  return (
    <View style={field.wrapper}>
      {hideLabel ? null : <AppText style={field.label}>{label}</AppText>}
      <Pressable
        onPress={() => setOpen((prev) => (inSheet ? !prev : true))}
        style={[
          field.container,
          styles.trigger,
          error ? styles.triggerError : null,
          open && inSheet && styles.triggerOpen,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${selectedLabel ?? placeholder}`}
        accessibilityState={{ expanded: open }}
      >
        <Row gap={spacing[2]} align="center" style={styles.triggerRow}>
          <AppText style={[styles.triggerText, !selectedLabel && styles.placeholder]}>
            {selectedLabel ?? placeholder}
          </AppText>
          <View style={[styles.chevronWrap, open && inSheet && styles.chevronOpen]}>
            <ChevronDown size={iconSize.md} color={c.textSecondary} strokeWidth={ICON_STROKE_WIDTH} />
          </View>
        </Row>
      </Pressable>

      {inSheet && open ? (
        <View style={styles.inlinePanel}>
          <ScrollView
            style={styles.inlineList}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {optionItems}
          </ScrollView>
        </View>
      ) : null}

      {error ? (
        <AppText style={field.error} accessibilityRole="alert" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}

      {!inSheet ? (
        <SheetModal
          visible={open}
          onClose={() => setOpen(false)}
          title={sheetTitle ?? label}
        >
          <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
            {optionItems}
          </ScrollView>
        </SheetModal>
      ) : null}
    </View>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    trigger: {
      minHeight: FIELD_MIN_HEIGHT,
      paddingVertical: spacing[3],
      paddingHorizontal: spacing[4],
      justifyContent: 'center' as const,
    },
    triggerRow: {
      width: '100%' as const,
    },
    triggerError: { borderColor: c.borderError },
    triggerOpen: {
      borderColor: c.borderFocus,
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
    },
    chevronWrap: {
      width: 24,
      height: 24,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      flexShrink: 0,
    },
    chevronOpen: { transform: [{ rotate: '180deg' }] },
    inlinePanel: {
      marginTop: -spacing[1.5] - 1,
      borderWidth: 1,
      borderTopWidth: 0,
      borderColor: c.borderFocus,
      borderBottomLeftRadius: radius.md,
      borderBottomRightRadius: radius.md,
      backgroundColor: c.surface,
      overflow: 'hidden' as const,
    },
    inlineList: { maxHeight: 220 },
    triggerText: {
      minWidth: 0,
      flex: 1,
      ...font.regular,
      fontSize: fontSize.base,
      color: c.textPrimary,
    },
    placeholder: { color: c.textTertiary },
    list: { maxHeight: 360 },
    item: {
      minHeight: FIELD_MIN_HEIGHT,
      justifyContent: 'center' as const,
      paddingVertical: spacing[3],
      paddingHorizontal: spacing[4],
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.borderLight,
    },
    itemActive: { backgroundColor: c.primaryLight },
    itemText: {
      ...font.regular,
      fontSize: fontSize.base,
      color: c.textPrimary,
    },
    itemTextActive: { color: c.primaryDark, ...font.semiBold },
  };
}
