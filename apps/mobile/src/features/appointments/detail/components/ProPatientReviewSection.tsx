import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { StyleSheet, View } from 'react-native';
import { Row } from '@/components/layout/primitives';
import { useQuery } from '@tanstack/react-query';
import { Star } from 'lucide-react-native';
import type { Appointment } from '@oneandlab/shared-types';
import { api } from '@/api/client';
import { ReviewStars } from '@/features/reviews/components/ReviewStars';
import { radius, spacing, iconSize, AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

type Review = { rating?: number; comment?: string };

export function ProPatientReviewSection({ apt }: { apt: Appointment }) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'features_appointments_detail_components_ProPatientReviewSection_tsx_ProPatientReviewSection_styles');

  const { data: review, isLoading } = useQuery({
    queryKey: ['reviews', 'appointment', apt.id] as const,
    enabled: apt.status === 'completed',
    queryFn: async () => {
      const res = await api.get<Review[]>(`/reviews?appointment_id=${encodeURIComponent(apt.id)}`);
      return res.data?.[0] ?? null;
    },
  });

  if (apt.status !== 'completed') return null;

  if (isLoading || !review) return null;

  return (
    <View style={styles.card}>
      <Row gap={spacing[2]} align="center">
        <Star size={iconSize.mdSm} color={c.star} fill={c.starFill} strokeWidth={1.5} />
        <AppText style={styles.title}>Avis patient</AppText>
      </Row>
      <ReviewStars rating={review.rating ?? 0} size={iconSize.md} showValue={false} />
      <AppText style={styles.comment}>
        {review.comment?.trim() || 'Pas de commentaire'}
      </AppText>
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
  card: {
    backgroundColor: c.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: c.borderLight,
    padding: spacing[4],
    gap: spacing[3],
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.base,
    color: c.textPrimary,
  },
  comment: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: c.textSecondary,
    lineHeight: 20,
  },
};
}
