import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';

import { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Row } from '@/components/layout/primitives';
import { ChevronDown } from 'lucide-react-native';
import { BottomSheet } from './BottomSheet';
import { useInBottomSheet } from './sheet-keyboard-context';
import { radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

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
  const styles = useThemedStyles(buildStyles, 'components_ui_SelectField_tsx_styles');
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
        <Text style={[styles.itemText, active && styles.itemTextActive]}>{opt.label}</Text>
      </Pressable>
    );
  });

  return (
    <View style={styles.wrap}>
      {hideLabel ? null : <Text style={styles.label}>{label}</Text>}
      <Pressable
        onPress={() => setOpen((prev) => (inSheet ? !prev : true))}
        style={[styles.trigger, error ? styles.triggerError : null, open && inSheet && styles.triggerOpen]}
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${selectedLabel ?? placeholder}`}
        accessibilityState={{ expanded: open }}
      >
        <Row gap={spacing[2]} align="center" style={styles.triggerRow}>
          <Text
            style={[styles.triggerText, !selectedLabel && styles.placeholder]}
            numberOfLines={1}
          >
            {selectedLabel ?? placeholder}
          </Text>
          <View style={[styles.chevronWrap, open && inSheet && styles.chevronOpen]}>
            <ChevronDown size={18} color={c.textSecondary} strokeWidth={2} />
          </View>
        </Row>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}

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

      {!inSheet ? (
        <BottomSheet
          visible={open}
          onClose={() => setOpen(false)}
          title={sheetTitle ?? label}
          stackBehavior="push"
        >
          <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
            {optionItems}
          </ScrollView>
        </BottomSheet>
      ) : null}
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
  trigger: {
    minHeight: 48,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
    paddingHorizontal: spacing[3],
    justifyContent: 'center' as const,
  },
  triggerRow: {
    width: '100%' as const,
    minHeight: 24,
  },
  triggerError: { borderColor: c.borderError },
  triggerOpen: {
    borderColor: c.primary,
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
    marginTop: -1,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: c.primary,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
    backgroundColor: c.surface,
    overflow: 'hidden' as const,
  },
  inlineList: { maxHeight: 220 },
  triggerText: {
    minWidth: 0,
    flex: 1,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    lineHeight: fontSize.sm * 1.25,
    color: c.textPrimary,
    ...(Platform.OS === 'android'
      ? { includeFontPadding: false, textAlignVertical: 'center' as const }
      : null),
  },
  placeholder: { color: c.textTertiary },
  error: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: c.error,
  },
  list: { maxHeight: 360 },
  item: {
    minHeight: 52,
    justifyContent: 'center' as const,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.borderLight,
  },
  itemActive: { backgroundColor: c.primaryLight },
  itemText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.base,
    lineHeight: fontSize.base * 1.25,
    color: c.textPrimary,
    ...(Platform.OS === 'android'
      ? { includeFontPadding: false, textAlignVertical: 'center' as const }
      : null),
  },
  itemTextActive: { color: c.primary, fontFamily: fontFamily.semiBold },
};
}

