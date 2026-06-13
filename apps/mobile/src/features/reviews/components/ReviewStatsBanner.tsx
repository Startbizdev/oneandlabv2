import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { Text, View } from 'react-native';
import { Row } from '@/components/layout/primitives';
import { LinearGradient } from 'expo-linear-gradient';
import { Star } from 'lucide-react-native';
import { ReviewStars } from '@/features/reviews/components/ReviewStars';
import type { ReviewStats } from '@/features/reviews/types';
import { radius, spacing } from '@/theme';
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

  const avg = stats.average_rating;
  const countLabel =
    stats.total_reviews > 1
      ? `${stats.total_reviews} avis reçus`
      : `${stats.total_reviews} avis reçu`;

  return (
    <LinearGradient
      colors={[c.starFill, c.warningLight, c.surface]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.wrap, { borderColor: c.warningMid }]}
    >
      <Row align="center" gap={spacing[4]}>
        <View style={[styles.iconBadge, { backgroundColor: c.surface }]}>
          <Star size={22} color={c.star} fill={c.starFill} strokeWidth={1.5} />
        </View>
        <Row align="center" gap={spacing[3]} flex={1}>
          <Text style={[styles.score, { color: c.textPrimary }]}>
            {avg.toFixed(1).replace('.', ',')}
          </Text>
          <View style={styles.meta}>
            <ReviewStars rating={avg} size={18} showValue={false} />
            <Text style={[styles.count, { color: c.textSecondary }]}>
              {subtitle ?? countLabel}
            </Text>
          </View>
        </Row>
      </Row>
    </LinearGradient>
  );
}

function buildStyles(c: AppColors) {
  return {
  wrap: {
    padding: spacing[4],
    borderRadius: radius.xl,
    borderWidth: 1,
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  score: {
    fontFamily: fontFamily.extraBold,
    fontSize: 40,
    letterSpacing: -1,
    lineHeight: 44,
  },
  meta: { flex: 1, minWidth: 0, gap: spacing[1] },
  count: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
  },
};
}
