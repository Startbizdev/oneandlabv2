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

const styles = StyleSheet.create({
  wrapper: { gap: spacing[2] },
  label: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
    color: colors.textPrimary,
  },
  scroll: {
    flexDirection: 'row',
    gap: spacing[2],
    paddingRight: spacing[4],
  },
  chip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  chipTextActive: { color: colors.textInverse },
});
