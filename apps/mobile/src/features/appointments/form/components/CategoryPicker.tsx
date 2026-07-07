import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { Pressable, ScrollView, View } from 'react-native';
import { Row } from '@/components/layout/primitives';
import type { CareCategory } from '@/features/categories/api/categories.service';
import { radius, spacing, AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  categories: CareCategory[];
  selectedId: string;
  onSelect: (cat: CareCategory) => void;
}

export function CategoryPicker({ categories, selectedId, onSelect }: Props) {
  const styles = useThemedStyles(buildStyles, 'features_appointments_form_components_CategoryPicker_tsx_styles');
  return (
    <View style={styles.wrapper}>
      <AppText style={styles.label}>Type de soin</AppText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Row gap={spacing[2]}>
        {categories.map((c) => {
          const on = selectedId === c.id;
          return (
            <Pressable
              key={c.id}
              onPress={() => onSelect(c)}
              style={[styles.chip, on && styles.chipActive]}
            >
              <AppText style={[styles.chipText, on && styles.chipTextActive]}>{c.label}</AppText>
            </Pressable>
          );
        })}
        </Row>
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
    paddingRight: spacing[4],
  },
  chip: {
    minHeight: 44,
    justifyContent: 'center' as const,
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

