import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { Row } from '@/components/layout/primitives';
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
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'CompactAssigneeRating.Empty');
  return (
    <View accessibilityLabel={`${label}, pas encore d'avis`}>
      <Row wrap gap={spacing[1]}>
        <Row gap={1} align="center">
          {Array.from({ length: 5 }, (_, index) => (
            <Star
              key={index}
              size={11}
              color={c.border}
              fill="transparent"
              strokeWidth={1.5}
            />
          ))}
        </Row>
        <Text style={styles.newLabel}>{label}</Text>
      </Row>
    </View>
  );
}

/** Note + nombre d'avis sous le nom d'un intervenant. */
export function CompactAssigneeRating({ summary, showNewWhenEmpty = false }: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'features_appointments_detail_components_CompactAssigneeRating_tsx_CompactAssigneeRating_styles');

  if (!summary) {
    return showNewWhenEmpty ? <EmptyAssigneeRating /> : null;
  }
  const { averageRating, reviewsCount } = summary;
  const filledStars = Math.min(5, Math.max(0, Math.round(averageRating)));

  return (
    <View
      accessibilityLabel={`Note ${averageRating.toFixed(1)} sur 5, ${formatReviewsCount(reviewsCount)}`}
    >
      <Row wrap gap={spacing[1]}>
        <Row gap={1} align="center">
          {Array.from({ length: 5 }, (_, index) => (
            <Star
              key={index}
              size={11}
              color={index < filledStars ? c.star : c.border}
              fill={index < filledStars ? c.starFill : 'transparent'}
              strokeWidth={1.5}
            />
          ))}
        </Row>
        <Text style={styles.rating}>{averageRating.toFixed(1)}</Text>
        <Text style={styles.separator}>·</Text>
        <Text style={styles.count}>{formatReviewsCount(reviewsCount)}</Text>
      </Row>
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
  rating: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: c.textPrimary,
    fontVariant: ['tabular-nums' as const],
  },
  separator: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: c.textTertiary,
  },
  count: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: c.textSecondary,
  },
  newLabel: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: c.textTertiary,
  },
};
}
