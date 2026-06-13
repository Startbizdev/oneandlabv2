import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { Pressable, ScrollView, Text } from 'react-native';
import { Row } from '@/components/layout/primitives';
import type { ReviewFilter } from '@/features/reviews/types';
import { radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

const FILTERS: { id: ReviewFilter; label: string }[] = [
  { id: 'all', label: 'Tous' },
  { id: 'pending', label: 'À répondre' },
  { id: 'answered', label: 'Répondus' },
];

interface Props {
  value: ReviewFilter;
  onChange: (v: ReviewFilter) => void;
  counts?: Partial<Record<ReviewFilter, number>>;
}

export function ReviewFilterChips({ value, onChange, counts }: Props) {
  const styles = useThemedStyles(buildStyles, 'features_reviews_components_ReviewFilterChips_tsx_styles');
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      <Row gap={spacing[2]}>
      {FILTERS.map((f) => {
        const active = value === f.id;
        const count = counts?.[f.id];
        const label = count != null && f.id !== 'all' ? `${f.label} (${count})` : f.label;
        return (
          <Pressable
            key={f.id}
            onPress={() => onChange(f.id)}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
          </Pressable>
        );
      })}
      </Row>
    </ScrollView>
  );
}

function buildStyles(c: AppColors) {
  return {
  row: {
    paddingVertical: spacing[1],
  },
  chip: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: c.borderLight,
    backgroundColor: c.surface,
  },
  chipActive: {
    backgroundColor: c.primary,
    borderColor: c.primary,
  },
  chipText: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: c.textSecondary,
  },
  chipTextActive: {
    color: c.textInverse,
  },
};
}

