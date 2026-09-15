import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { View } from 'react-native';
import { Row } from '@/components/layout/primitives';
import { ReviewStars } from '@/features/reviews/components/ReviewStars';
import type { ReviewStats } from '@/features/reviews/types';
import { radius, spacing, iconSize, AppText } from '@/theme';
import { useAppColors } from '@/theme/use-app-colors';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  stats: ReviewStats;
  /** Libellé sous le nombre d'avis */
  subtitle?: string;
}

export function ReviewStatsBanner({ stats, subtitle }: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'features_reviews_components_ReviewStatsBanner_tsx_ReviewStatsBanner_styles');

  const avg = Number(stats.average_rating) || 0;
  const countLabel =
    stats.total_reviews > 1
      ? `${stats.total_reviews} avis reçus`
      : `${stats.total_reviews} avis reçu`;

  return (
    <View style={styles.wrap}>
      <Row align="center" gap={spacing[4]}>
        <Row align="center" gap={spacing[3]} flex={1} wrap>
          <AppText style={[styles.score, { color: c.textPrimary }]}>
            {avg.toFixed(1).replace('.', ',')}
          </AppText>
          <View style={styles.meta}>
            <ReviewStars rating={avg} size={iconSize.mdSm} showValue={false} />
            <AppText style={[styles.count, { color: c.textSecondary }]}>
              {subtitle ?? countLabel}
            </AppText>
          </View>
        </Row>
      </Row>
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
  wrap: {
    padding: spacing[4],
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: c.borderLight,
    backgroundColor: c.surface,
  },
  score: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize['3xl'],
  },
  meta: { flex: 1, minWidth: 0, gap: spacing[1] },
  count: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
  },
};
}
