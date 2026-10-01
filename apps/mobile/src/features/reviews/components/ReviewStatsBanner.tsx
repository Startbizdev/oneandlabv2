import { View } from 'react-native';
import { Row } from '@/components/layout/primitives';
import { ReviewStars } from '@/features/reviews/components/ReviewStars';
import type { ReviewStats } from '@/features/reviews/types';
import { AppText, iconSize, spacing, useStyles } from '@/theme';

interface Props {
  stats: ReviewStats;
}

/** Note moyenne reçue façon App Store : chiffre fort, étoiles, volume d'avis. */
export function ReviewStatsBanner({ stats }: Props) {
  const styles = useStyles(buildStyles);
  const avg = Number(stats.average_rating) || 0;
  const countLabel = `${stats.total_reviews} avis reçu${stats.total_reviews > 1 ? 's' : ''}`;

  return (
    <Row gap={spacing[4]} align="center">
      <AppText variant="display" accessibilityLabel={`Note moyenne ${avg.toFixed(1)} sur 5`}>
        {avg.toFixed(1).replace('.', ',')}
      </AppText>
      <View style={styles.meta}>
        <ReviewStars rating={avg} size={iconSize.md} showValue={false} />
        <AppText variant="secondary">{countLabel}</AppText>
      </View>
    </Row>
  );
}

function buildStyles() {
  return {
    meta: { flex: 1, minWidth: 0, gap: spacing[1] },
  };
}
