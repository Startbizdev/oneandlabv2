import { View } from 'react-native';
import { Row } from '@/components/layout/primitives';
import { Card } from '@/components/ui/Card';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { ReviewResponseBlock } from '@/features/reviews/components/ReviewResponseBlock';
import { ReviewStars } from '@/features/reviews/components/ReviewStars';
import type { Review } from '@/features/reviews/types';
import { formatReviewDate, reviewAppointmentContext } from '@/features/reviews/utils/review-labels';
import { AppText, iconSize, spacing, useStyles } from '@/theme';

const AVATAR_SIZE = 40;

interface Props {
  review: Review;
}

export function ReviewGivenCard({ review }: Props) {
  const styles = useStyles(buildStyles);
  const proName = review.reviewee_name?.trim() || 'Professionnel';
  const date = formatReviewDate(review.created_at);
  const context = reviewAppointmentContext(review);
  const comment = review.comment?.trim();
  const response = review.response?.trim();

  return (
    <Card style={styles.card}>
      <Row gap={spacing[3]} align="start">
        <ProfileAvatar
          profileImageUrl={review.reviewee_profile_image_url}
          seed={review.reviewee_id ?? proName}
          gender={review.reviewee_gender}
          size={AVATAR_SIZE}
        />
        <View style={styles.identity}>
          <AppText variant="headline">{proName}</AppText>
          {context ? <AppText variant="caption">{context}</AppText> : null}
        </View>
      </Row>

      <Row gap={spacing[2]} wrap>
        <ReviewStars rating={review.rating ?? 0} size={iconSize.sm} showValue={false} />
        {date ? <AppText variant="caption">{date}</AppText> : null}
      </Row>

      {comment ? <AppText variant="body">{comment}</AppText> : null}

      {response ? <ReviewResponseBlock label="Réponse du professionnel" text={response} /> : null}
    </Card>
  );
}

function buildStyles() {
  return {
    card: { gap: spacing[3] },
    identity: { flex: 1, minWidth: 0, gap: spacing[0.5] },
  };
}
