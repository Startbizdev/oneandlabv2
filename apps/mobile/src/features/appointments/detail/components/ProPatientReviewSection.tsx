import { StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Star } from 'lucide-react-native';
import type { Appointment } from '@oneandlab/shared-types';
import { api } from '@/api/client';
import { ReviewStars } from '@/features/reviews/components/ReviewStars';
import { colors, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

type Review = { rating?: number; comment?: string };

export function ProPatientReviewSection({ apt }: { apt: Appointment }) {
  if (apt.status !== 'completed') return null;

  const { data: review, isLoading } = useQuery({
    queryKey: ['reviews', 'appointment', apt.id] as const,
    queryFn: async () => {
      const res = await api.get<Review[]>(`/reviews?appointment_id=${encodeURIComponent(apt.id)}`);
      return res.data?.[0] ?? null;
    },
  });

  if (isLoading || !review) return null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Star size={18} color={colors.star} fill={colors.starFill} strokeWidth={1.5} />
        <Text style={styles.title}>Avis patient</Text>
      </View>
      <ReviewStars rating={review.rating ?? 0} size={20} showValue={false} />
      <Text style={styles.comment}>
        {review.comment?.trim() || 'Pas de commentaire'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[4],
    gap: spacing[3],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.base,
    color: colors.textPrimary,
  },
  comment: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
