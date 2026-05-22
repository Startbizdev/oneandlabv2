import { StyleSheet, Text, View } from 'react-native';
import { Stethoscope, MessageSquare } from 'lucide-react-native';
import { ReviewStars } from '@/features/reviews/components/ReviewStars';
import type { Review } from '@/features/reviews/types';
import {
  appointmentTypeLabel,
  formatReviewDate,
} from '@/features/reviews/utils/review-labels';
import { colors, elevation, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';

dayjs.locale('fr');

interface Props {
  review: Review;
}

export function ReviewGivenCard({ review }: Props) {
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
      <View style={styles.header}>
        <View style={styles.proBadge}>
          <Stethoscope size={16} color={colors.primary} strokeWidth={2} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.proLabel}>Pour</Text>
          <Text style={styles.proName} numberOfLines={1}>
            {proName}
          </Text>
        </View>
        {date ? <Text style={styles.date}>{date}</Text> : null}
      </View>

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
          <View style={styles.responseHeader}>
            <MessageSquare size={12} color={colors.textSecondary} strokeWidth={2} />
            <Text style={styles.responseLabel}>Réponse du professionnel</Text>
          </View>
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
  proBadge: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1, minWidth: 0 },
  proLabel: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textTertiary,
  },
  proName: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.base,
    color: colors.textPrimary,
  },
  date: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: colors.textTertiary,
  },
  context: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: fontSize.sm * 1.4,
  },
  comment: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
    color: colors.textPrimary,
    lineHeight: fontSize.base * 1.55,
  },
  responseBox: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    padding: spacing[3],
    gap: spacing[2],
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  responseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
  },
  responseLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  responseText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    lineHeight: fontSize.sm * 1.5,
  },
  hiddenPill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing[2],
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  hiddenText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: colors.textTertiary,
  },
});
