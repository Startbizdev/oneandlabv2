import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ReviewStars } from '@/features/reviews/components/ReviewStars';
import type { Review } from '@/features/reviews/types';
import { reviewerDisplayName } from '@/features/reviews/utils/review-labels';
import { radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';
import { MessageSquare } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { Row } from '@/components/layout/primitives';

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
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'features_reviews_components_ReviewReplySheet_tsx_ReviewReplySheet_styles');

  if (!review) return null;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Répondre à l'avis"
      subtitle={reviewerDisplayName(review)}
      headerIcon={<MessageSquare size={20} color={c.primary} strokeWidth={2} />}
    >
      <View style={styles.preview}>
        <ReviewStars rating={review.rating ?? 0} size={14} />
        <Text style={styles.previewComment}>
          {review.comment?.trim() ? `« ${review.comment.trim()} »` : 'Pas de commentaire texte.'}
        </Text>
      </View>
      <Input
        label="Votre réponse"
        value={draft}
        onChangeText={onChangeDraft}
        multiline
        numberOfLines={5}
        placeholder="Remerciez le patient ou apportez des précisions…"
        style={styles.input}
      />
      <Text style={styles.hint}>Votre réponse sera visible sur votre fiche publique Cary.</Text>
      <Row gap={spacing[3]} style={styles.actions}>
        <View style={styles.actionBtn}>
          <Button title="Annuler" variant="outline" onPress={onClose} fullWidth size="lg" />
        </View>
        <View style={styles.actionBtn}>
          <Button
            title="Publier"
            loading={submitting}
            disabled={!draft.trim()}
            onPress={onSubmit}
            fullWidth
          />
        </View>
      </Row>
    </BottomSheet>
  );
}

function buildStyles(c: AppColors) {
  return {
  preview: {
    backgroundColor: c.surfaceAlt,
    borderRadius: radius.lg,
    padding: spacing[3],
    gap: spacing[2],
    borderLeftWidth: 3,
    borderLeftColor: c.star,
  },
  previewComment: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: c.textPrimary,
    lineHeight: fontSize.sm * 1.5,
    fontStyle: 'italic' as const,
  },
  input: { minHeight: 120, textAlignVertical: 'top' as const },
  hint: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: c.textTertiary,
    lineHeight: fontSize.xs * 1.45,
  },
  actions: {
    marginTop: spacing[2],
    paddingTop: spacing[3],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.borderLight,
  },
  actionBtn: { minWidth: 0, flex: 1 },
};
}
