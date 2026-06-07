import { StyleSheet, Text, View } from 'react-native';
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
      <View style={[styles.iconBadge, { backgroundColor: c.surface }]}>
        <Star size={22} color={c.star} fill={c.starFill} strokeWidth={1.5} />
      </View>
      <View style={styles.main}>
        <Text style={[styles.score, { color: c.textPrimary }]}>
          {avg.toFixed(1).replace('.', ',')}
        </Text>
        <View style={styles.meta}>
          <ReviewStars rating={avg} size={18} showValue={false} />
          <Text style={[styles.count, { color: c.textSecondary }]}>
            {subtitle ?? countLabel}
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    padding: spacing[4],
    borderRadius: radius.xl,
    borderWidth: 1,
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  main: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  score: {
    fontFamily: fontFamily.extraBold,
    fontSize: 40,
    letterSpacing: -1,
    lineHeight: 44,
  },
  meta: { flex: 1, gap: spacing[1] },
  count: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
  },
});
