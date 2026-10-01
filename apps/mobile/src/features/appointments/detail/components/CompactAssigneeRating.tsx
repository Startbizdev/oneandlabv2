import { useAppColors } from '@/theme/use-app-colors';
import { Row } from '@/components/layout/primitives';
import { StyleSheet, View } from 'react-native';
import { Star } from 'lucide-react-native';
import { spacing, iconSize, AppText, useStyles, font, type Theme } from '@/theme';
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
  const styles = useStyles(buildStyles);
  return (
    <View accessibilityLabel={`${label}, pas encore d'avis`}>
      <Row wrap gap={spacing[1]}>
        <Row gap={1} align="center">
          {Array.from({ length: 5 }, (_, index) => (
            <Star
              key={index}
              size={iconSize['2xs']}
              color={c.border}
              fill="transparent"
              strokeWidth={1.5}
            />
          ))}
        </Row>
        <AppText style={styles.newLabel}>{label}</AppText>
      </Row>
    </View>
  );
}

/** Note + nombre d'avis sous le nom d'un intervenant. */
export function CompactAssigneeRating({ summary, showNewWhenEmpty = false }: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);

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
              size={iconSize['2xs']}
              color={index < filledStars ? c.star : c.border}
              fill={index < filledStars ? c.starFill : 'transparent'}
              strokeWidth={1.5}
            />
          ))}
        </Row>
        <AppText style={styles.rating}>{averageRating.toFixed(1)}</AppText>
        <AppText style={styles.separator}>·</AppText>
        <AppText style={styles.count}>{formatReviewsCount(reviewsCount)}</AppText>
      </Row>
    </View>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
  rating: {
    ...font.semiBold,
    fontSize: fontSize.xs,
    color: c.textPrimary,
    fontVariant: ['tabular-nums' as const],
  },
  separator: {
    ...font.regular,
    fontSize: fontSize.xs,
    color: c.textTertiary,
  },
  count: {
    ...font.medium,
    fontSize: fontSize.xs,
    color: c.textSecondary,
  },
  newLabel: {
    ...font.medium,
    fontSize: fontSize.xs,
    color: c.textTertiary,
  },
};
}
