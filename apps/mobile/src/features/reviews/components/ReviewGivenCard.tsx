import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { Text, View } from 'react-native';
import { Cluster, Row } from '@/components/layout/primitives';
import { MessageSquare } from 'lucide-react-native';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { ReviewStars } from '@/features/reviews/components/ReviewStars';
import type { Review } from '@/features/reviews/types';
import {
  appointmentTypeLabel,
  formatReviewDate,
} from '@/features/reviews/utils/review-labels';
import { elevation, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';

dayjs.locale('fr');

interface Props {
  review: Review;
}

export function ReviewGivenCard({ review }: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'features_reviews_components_ReviewGivenCard_tsx_ReviewGivenCard_styles');

  const proName = review.reviewee_name?.trim() || 'Professionnel';
  const date = formatReviewDate(review.created_at);
  const aptMeta = [
    appointmentTypeLabel(review.appointment_type),
    review.category_name,
  ]
    .filter(Boolean)
    .join(' · ');
  const aptDate = review.appointment_scheduled_at
    ? dayjs(review.appointment_scheduled_at).format('D MMM YYYY')
    : null;

  return (
    <View style={[styles.card, elevation.xs]}>
      <Cluster
        gap={spacing[2]}
        leading={
          <ProfileAvatar
            profileImageUrl={review.reviewee_profile_image_url}
            seed={review.reviewee_id ?? proName}
            gender={review.reviewee_gender}
            size={40}
            style={styles.proAvatar}
          />
        }
        actions={date ? <Text style={styles.date}>{date}</Text> : undefined}
      >
        <View>
          <Text style={styles.proLabel}>Pour</Text>
          <Text style={styles.proName} numberOfLines={1}>
            {proName}
          </Text>
        </View>
      </Cluster>

      <ReviewStars rating={review.rating ?? 0} size={18} />

      {aptMeta || aptDate ? (
        <Text style={styles.context}>
          {aptMeta}
          {aptMeta && aptDate ? ' — ' : ''}
          {aptDate ? `RDV du ${aptDate}` : ''}
        </Text>
      ) : null}

      {review.comment?.trim() ? (
        <Text style={styles.comment}>{review.comment.trim()}</Text>
      ) : null}

      {review.response?.trim() ? (
        <View style={styles.responseBox}>
          <Row gap={spacing[1.5]}>
            <MessageSquare size={12} color={c.textSecondary} strokeWidth={2} />
            <Text style={styles.responseLabel}>Réponse du professionnel</Text>
          </Row>
          <Text style={styles.responseText}>{review.response.trim()}</Text>
        </View>
      ) : null}

      {review.is_visible === false ? (
        <View style={styles.hiddenPill}>
          <Text style={styles.hiddenText}>Masqué</Text>
        </View>
      ) : null}
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
  proAvatar: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    overflow: 'hidden' as const,
    flexShrink: 0,
  },
  proLabel: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: c.textTertiary,
  },
  proName: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.base,
    color: c.textPrimary,
  },
  date: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: c.textTertiary,
  },
  context: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: c.textSecondary,
    lineHeight: fontSize.sm * 1.4,
  },
  comment: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
    color: c.textPrimary,
    lineHeight: fontSize.base * 1.55,
  },
  responseBox: {
    backgroundColor: c.surfaceAlt,
    borderRadius: radius.lg,
    padding: spacing[3],
    gap: spacing[2],
    borderWidth: 1,
    borderColor: c.borderLight,
  },
  responseLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: c.textSecondary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.3,
  },
  responseText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: c.textPrimary,
    lineHeight: fontSize.sm * 1.5,
  },
  hiddenPill: {
    alignSelf: 'flex-start' as const,
    backgroundColor: c.surfaceAlt,
    paddingHorizontal: spacing[2],
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  hiddenText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: c.textTertiary,
  },
};
}
