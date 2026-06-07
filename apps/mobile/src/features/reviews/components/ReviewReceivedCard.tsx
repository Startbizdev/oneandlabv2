import type { AppColors } from '@/theme/colors';
import { getThemedStyles } from '@/theme/use-themed-styles';
import { colors } from '@/theme';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MessageSquare } from 'lucide-react-native';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { ReviewStars } from '@/features/reviews/components/ReviewStars';
import type { Review } from '@/features/reviews/types';
import {
  appointmentTypeLabel,
  formatReviewDate,
  reviewerDisplayName,
} from '@/features/reviews/utils/review-labels';
import { elevation, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';

dayjs.locale('fr');

interface Props {
  review: Review;
  onReply?: () => void;
}

export function ReviewReceivedCard({ review, onReply }: Props) {
  const name = reviewerDisplayName(review);
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
  const hasResponse = Boolean(review.response?.trim());

  return (
    <View style={[styles.card, elevation.xs]}>
      <View style={styles.topRow}>
        <View style={styles.authorRow}>
          <ProfileAvatar
            profileImageUrl={null}
            seed={name}
            size={36}
            style={styles.avatar}
          />
          <View style={styles.authorText}>
            <Text style={styles.authorName}>{name}</Text>
            {aptMeta || aptDate ? (
              <Text style={styles.meta} numberOfLines={2}>
                {aptMeta}
                {aptMeta && aptDate ? ' — ' : ''}
                {aptDate ? `RDV du ${aptDate}` : ''}
              </Text>
            ) : null}
          </View>
        </View>
        {date ? <Text style={styles.date}>{date}</Text> : null}
      </View>

      <ReviewStars rating={review.rating ?? 0} size={18} />

      {review.comment?.trim() ? (
        <View style={styles.quote}>
          <Text style={styles.comment}>{review.comment.trim()}</Text>
        </View>
      ) : (
        <Text style={styles.noComment}>Aucun commentaire écrit</Text>
      )}

      {hasResponse ? (
        <View style={styles.responseBox}>
          <View style={styles.responseHeader}>
            <MessageSquare size={14} color={colors.primary} strokeWidth={2} />
            <Text style={styles.responseLabel}>Votre réponse</Text>
          </View>
          <Text style={styles.responseText}>{review.response!.trim()}</Text>
        </View>
      ) : onReply ? (
        <Pressable onPress={onReply} style={styles.replyBtn}>
          <MessageSquare size={16} color={colors.primary} strokeWidth={2} />
          <Text style={styles.replyBtnText}>Répondre à cet avis</Text>
        </Pressable>
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
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing[2],
  },
  authorRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
    minWidth: 0,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: c.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorText: { flex: 1, gap: 2, minWidth: 0 },
  authorName: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: c.textPrimary,
  },
  meta: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: c.textSecondary,
    lineHeight: fontSize.xs * 1.35,
  },
  date: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: c.textTertiary,
  },
  quote: {
    borderLeftWidth: 3,
    borderLeftColor: c.starFill,
    paddingLeft: spacing[3],
    backgroundColor: c.surfaceAlt,
    borderRadius: radius.md,
    paddingVertical: spacing[2],
    paddingRight: spacing[2],
  },
  comment: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
    color: c.textPrimary,
    lineHeight: fontSize.base * 1.55,
  },
  noComment: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: c.textTertiary,
    fontStyle: 'italic',
  },
  responseBox: {
    backgroundColor: c.primaryLight,
    borderRadius: radius.lg,
    padding: spacing[3],
    gap: spacing[2],
    borderWidth: 1,
    borderColor: c.primaryMid,
  },
  responseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
  },
  responseLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: c.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  responseText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: c.primaryDark,
    lineHeight: fontSize.sm * 1.5,
  },
  replyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: c.primary,
    backgroundColor: c.surface,
  },
  replyBtnText: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: c.primary,
  },
};
}

const styles = new Proxy({} as Record<string, any>, {
  get(_target, prop: string | symbol) {
    if (typeof prop === 'string') {
      return getThemedStyles('features_reviews_components_ReviewReceivedCard_tsx_styles', buildStyles)[prop];
    }
    return undefined;
  },
});
