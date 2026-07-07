import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';

import { Pressable, View } from 'react-native';
import { Cluster, Row } from '@/components/layout/primitives';
import { MessageSquare } from 'lucide-react-native';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { ReviewStars } from '@/features/reviews/components/ReviewStars';
import type { Review } from '@/features/reviews/types';
import {
  appointmentTypeLabel,
  formatReviewDate,
  reviewerDisplayName,
} from '@/features/reviews/utils/review-labels';
import { elevation, radius, spacing, iconSize, AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';

dayjs.locale('fr');

interface Props {
  review: Review;
  onReply?: () => void;
}

export function ReviewReceivedCard({
  review, onReply }: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'features_reviews_components_ReviewReceivedCard_tsx_styles');
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
      <Cluster
        gap={spacing[2]}
        align="start"
        leading={
          <ProfileAvatar
            profileImageUrl={null}
            seed={name}
            size={iconSize['3xl']}
            style={styles.avatar}
          />
        }
        actions={date ? <AppText style={styles.date}>{date}</AppText> : undefined}
      >
        <View style={styles.authorText}>
          <AppText style={styles.authorName}>{name}</AppText>
          {aptMeta || aptDate ? (
            <AppText style={styles.meta} numberOfLines={2}>
              {aptMeta}
              {aptMeta && aptDate ? ' — ' : ''}
              {aptDate ? `RDV du ${aptDate}` : ''}
            </AppText>
          ) : null}
        </View>
      </Cluster>

      <ReviewStars rating={review.rating ?? 0} size={iconSize.mdSm} />

      {review.comment?.trim() ? (
        <View style={styles.quote}>
          <AppText style={styles.comment}>{review.comment.trim()}</AppText>
        </View>
      ) : (
        <AppText style={styles.noComment}>Aucun commentaire écrit</AppText>
      )}

      {hasResponse ? (
        <View style={styles.responseBox}>
          <Row gap={spacing[1.5]}>
            <MessageSquare size={iconSize.xs} color={c.primary} strokeWidth={2} />
            <AppText style={styles.responseLabel}>Votre réponse</AppText>
          </Row>
          <AppText style={styles.responseText}>{review.response!.trim()}</AppText>
        </View>
      ) : onReply ? (
        <Pressable onPress={onReply} style={styles.replyBtn}>
          <Row justify="center" gap={spacing[2]}>
            <MessageSquare size={iconSize.sm} color={c.primary} strokeWidth={2} />
            <AppText style={styles.replyBtnText}>Répondre à cet avis</AppText>
          </Row>
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
  avatar: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: c.primaryLight,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  authorText: { gap: 2 },
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
    fontStyle: 'italic' as const,
  },
  responseBox: {
    backgroundColor: c.primaryLight,
    borderRadius: radius.lg,
    padding: spacing[3],
    gap: spacing[2],
    borderWidth: 1,
    borderColor: c.primaryMid,
  },
  responseLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: c.primary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.4,
  },
  responseText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: c.primaryDark,
    lineHeight: fontSize.sm * 1.5,
  },
  replyBtn: {
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

