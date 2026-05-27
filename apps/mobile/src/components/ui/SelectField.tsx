import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import { BottomSheet } from './BottomSheet';
import { useInBottomSheet } from './sheet-keyboard-context';
import { colors, radius, spacing } from '@/theme';
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
}

export function SelectField({
  label,
  value,
  options,
  onChange,
  placeholder = 'Choisir…',
  error,
  sheetTitle,
}: Props) {
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
      >
        <Text style={[styles.itemText, active && styles.itemTextActive]}>{opt.label}</Text>
      </Pressable>
    );
  });

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        onPress={() => setOpen((prev) => (inSheet ? !prev : true))}
        style={[styles.trigger, error ? styles.triggerError : null, open && inSheet && styles.triggerOpen]}
      >
        <Text
          style={[styles.triggerText, !selectedLabel && styles.placeholder]}
          numberOfLines={2}
        >
          {selectedLabel ?? placeholder}
        </Text>
        <View style={open && inSheet ? styles.chevronOpen : undefined}>
          <ChevronDown size={18} color={colors.textSecondary} strokeWidth={2} />
        </View>
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

const styles = StyleSheet.create({
  wrap: { gap: spacing[2] },
  label: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  trigger: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  triggerError: { borderColor: colors.borderError },
  triggerOpen: {
    borderColor: colors.primary,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  chevronOpen: { transform: [{ rotate: '180deg' }] },
  inlinePanel: {
    marginTop: -1,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: colors.primary,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  inlineList: { maxHeight: 220 },
  triggerText: {
    flex: 1,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  placeholder: { color: colors.textTertiary },
  error: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: colors.error,
  },
  list: { maxHeight: 360 },
  item: {
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[1],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  itemActive: { backgroundColor: colors.primaryLight },
  itemText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    lineHeight: fontSize.sm * 1.4,
  },
  itemTextActive: { color: colors.primary, fontFamily: fontFamily.semiBold },
});
