import { View } from 'react-native';
import { Row } from '@/components/layout/primitives';
import { ReviewStars } from '@/features/reviews/components/ReviewStars';
import type { ReviewStats } from '@/features/reviews/types';
import { radius, spacing, iconSize, AppText, useStyles, font, type Theme } from '@/theme';
import { useAppColors } from '@/theme/use-app-colors';

interface Props {
  stats: ReviewStats;
  /** Libellé sous le nombre d'avis */
  subtitle?: string;
}

export function ReviewStatsBanner({ stats, subtitle }: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);

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

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
  wrap: {
    padding: spacing[4],
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: c.borderLight,
    backgroundColor: c.surface,
  },
  score: {
    ...font.headingSemiBold,
    fontSize: fontSize['3xl'],
  },
  meta: { flex: 1, minWidth: 0, gap: spacing[1] },
  count: {
    ...font.medium,
    fontSize: fontSize.sm,
  },
};
}
