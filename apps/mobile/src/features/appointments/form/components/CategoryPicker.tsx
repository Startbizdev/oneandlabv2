import type { AppColors } from '@/theme/colors';
import { getThemedStyles } from '@/theme/use-themed-styles';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { CareCategory } from '@/features/categories/api/categories.service';
import { colors, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  categories: CareCategory[];
  selectedId: string;
  onSelect: (cat: CareCategory) => void;
}

export function CategoryPicker({ categories, selectedId, onSelect }: Props) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>Type de soin</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {categories.map((c) => {
          const on = selectedId === c.id;
          return (
            <Pressable
              key={c.id}
              onPress={() => onSelect(c)}
              style={[styles.chip, on && styles.chipActive]}
            >
              <Text style={[styles.chipText, on && styles.chipTextActive]}>{c.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
  wrapper: { gap: spacing[2] },
  label: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
    color: c.textPrimary,
  },
  scroll: {
    flexDirection: 'row',
    gap: spacing[2],
    paddingRight: spacing[4],
  },
  chip: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
  },
  chipActive: {
    backgroundColor: c.primary,
    borderColor: c.primary,
  },
  chipText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: c.textSecondary,
    lineHeight: fontSize.sm * 1.35,
  },
  chipTextActive: { color: c.textInverse },
};
}

const styles = new Proxy({} as Record<string, any>, {
  get(_target, prop: string | symbol) {
    if (typeof prop === 'string') {
      return getThemedStyles('features_appointments_form_components_CategoryPicker_tsx_styles', buildStyles)[prop];
    }
    return undefined;
  },
});
