import { colors } from '@/theme';
import { StyleSheet, Text, View } from 'react-native';
import { Star } from 'lucide-react-native';
import { spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';
import {
  formatReviewsCount,
  type AssigneeReviewSummary,
} from '../utils/assignee-review-display';
interface Props {
  summary: AssigneeReviewSummary | null | undefined;
  /** Liste RDV : étoiles grises + « Nouveau » si aucun avis. */
  showNewWhenEmpty?: boolean;
}

function EmptyAssigneeRating({ label = 'Nouveau' }: { label?: string }) {
  return (
    <View
      style={styles.row}
      accessibilityLabel={`${label}, pas encore d'avis`}
    >
      <View style={styles.stars}>
        {Array.from({ length: 5 }, (_, index) => (
          <Star
            key={index}
            size={11}
            color={colors.border}
            fill="transparent"
            strokeWidth={1.5}
          />
        ))}
      </View>
      <Text style={styles.newLabel}>{label}</Text>
    </View>
  );
}

/** Note + nombre d'avis sous le nom d'un intervenant. */
export function CompactAssigneeRating({ summary, showNewWhenEmpty = false }: Props) {
  if (!summary) {
    return showNewWhenEmpty ? <EmptyAssigneeRating /> : null;
  }
  const { averageRating, reviewsCount } = summary;
  const filledStars = Math.min(5, Math.max(0, Math.round(averageRating)));

  return (
    <View
      style={styles.row}
      accessibilityLabel={`Note ${averageRating.toFixed(1)} sur 5, ${formatReviewsCount(reviewsCount)}`}
    >
      <View style={styles.stars}>
        {Array.from({ length: 5 }, (_, index) => (
          <Star
            key={index}
            size={11}
            color={index < filledStars ? colors.star : colors.border}
            fill={index < filledStars ? colors.starFill : 'transparent'}
            strokeWidth={1.5}
          />
        ))}
      </View>
      <Text style={styles.rating}>{averageRating.toFixed(1)}</Text>
      <Text style={styles.separator}>·</Text>
      <Text style={styles.count}>{formatReviewsCount(reviewsCount)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    flexWrap: 'wrap',
  },
  stars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  rating: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  separator: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textTertiary,
  },
  count: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  newLabel: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: colors.textTertiary,
  },
});
