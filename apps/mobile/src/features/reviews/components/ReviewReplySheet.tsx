import { View } from 'react-native';
import { REVIEW_RESPONSE_MAX_LENGTH } from '@oneandlab/shared-api';
import { Row } from '@/components/layout/primitives';
import { Button } from '@/components/ui/Button';
import { SheetModal } from '@/components/ui/SheetModal';
import { Textarea } from '@/components/ui/Textarea';
import { ReviewStars } from '@/features/reviews/components/ReviewStars';
import type { Review } from '@/features/reviews/types';
import { reviewerDisplayName } from '@/features/reviews/utils/review-labels';
import { AppText, iconSize, spacing, useStyles } from '@/theme';

interface Props {
  visible: boolean;
  review: Review | null;
  draft: string;
  onChangeDraft: (v: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  submitting?: boolean;
}

export function ReviewReplySheet({
  visible,
  review,
  draft,
  onChangeDraft,
  onClose,
  onSubmit,
  submitting,
}: Props) {
  const styles = useStyles(buildStyles);

  if (!review) return null;
  const comment = review.comment?.trim();

  return (
    <SheetModal
      visible={visible}
      onClose={onClose}
      dismissible={!submitting}
      title="Répondre à l’avis"
      subtitle={reviewerDisplayName(review)}
    >
      <View style={styles.body}>
        <View style={styles.preview}>
          <ReviewStars rating={review.rating ?? 0} size={iconSize.sm} showValue={false} />
          {comment ? <AppText variant="secondary">{comment}</AppText> : null}
        </View>
        <Textarea
          label="Votre réponse"
          hint={`Visible sur votre profil public Cary · ${draft.length}/${REVIEW_RESPONSE_MAX_LENGTH}`}
          value={draft}
          onChangeText={onChangeDraft}
          maxLength={REVIEW_RESPONSE_MAX_LENGTH}
          editable={!submitting}
          placeholder="Remerciez le patient ou apportez une précision…"
        />
        <Row gap={spacing[3]}>
          <View style={styles.action}>
            <Button title="Annuler" variant="ghost" size="lg" fullWidth onPress={onClose} disabled={submitting} />
          </View>
          <View style={styles.action}>
            <Button
              title="Publier"
              size="lg"
              fullWidth
              loading={submitting}
              disabled={submitting || !draft.trim()}
              onPress={onSubmit}
            />
          </View>
        </Row>
      </View>
    </SheetModal>
  );
}

function buildStyles() {
  return {
    body: { gap: spacing[4] },
    preview: { gap: spacing[2] },
    action: { flex: 1, minWidth: 0 },
  };
}
