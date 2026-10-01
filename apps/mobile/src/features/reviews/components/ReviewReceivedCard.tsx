import { View } from 'react-native';
import { MessageSquare } from 'lucide-react-native';
import { Row } from '@/components/layout/primitives';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { ReviewResponseBlock } from '@/features/reviews/components/ReviewResponseBlock';
import { ReviewStars } from '@/features/reviews/components/ReviewStars';
import type { Review } from '@/features/reviews/types';
import {
  formatReviewDate,
  reviewAppointmentContext,
  reviewerDisplayName,
} from '@/features/reviews/utils/review-labels';
import { useAppColors } from '@/theme/use-app-colors';
import { AppText, ICON_STROKE_WIDTH, iconSize, spacing, useStyles } from '@/theme';

const AVATAR_SIZE = 40;

interface Props {
  review: Review;
  onReply?: () => void;
}

export function ReviewReceivedCard({ review, onReply }: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const name = reviewerDisplayName(review);
  const date = formatReviewDate(review.created_at);
  const context = reviewAppointmentContext(review);
  const comment = review.comment?.trim();
  const response = review.response?.trim();

  return (
    <Card style={styles.card}>
      <Row gap={spacing[3]} align="start">
        <ProfileAvatar profileImageUrl={null} seed={name} size={AVATAR_SIZE} />
        <View style={styles.identity}>
          <AppText variant="headline">{name}</AppText>
          {context ? <AppText variant="caption">{context}</AppText> : null}
        </View>
      </Row>

      <Row gap={spacing[2]} wrap>
        <ReviewStars rating={review.rating ?? 0} size={iconSize.sm} showValue={false} />
        {date ? <AppText variant="caption">{date}</AppText> : null}
      </Row>

      {comment ? <AppText variant="body">{comment}</AppText> : null}

      {response ? (
        <ReviewResponseBlock label="Votre réponse" text={response} />
      ) : onReply ? (
        <Button
          title="Répondre"
          variant="outline"
          size="sm"
          onPress={onReply}
          leftIcon={<MessageSquare size={iconSize.md} color={c.primary} strokeWidth={ICON_STROKE_WIDTH} />}
          style={styles.reply}
        />
      ) : null}
    </Card>
  );
}

function buildStyles() {
  return {
    card: { gap: spacing[3] },
    identity: { flex: 1, minWidth: 0, gap: spacing[0.5] },
    reply: { alignSelf: 'flex-start' as const },
  };
}
