import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ReviewStars } from '@/features/reviews/components/ReviewStars';
import type { Review } from '@/features/reviews/types';
import { reviewerDisplayName } from '@/features/reviews/utils/review-labels';
import { colors, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';
import { MessageSquare } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

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
  if (!review) return null;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Répondre à l'avis"
      subtitle={reviewerDisplayName(review)}
      headerIcon={<MessageSquare size={20} color={colors.primary} strokeWidth={2} />}
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
      <View style={styles.actions}>
        <View style={styles.actionBtn}>
          <Button title="Annuler" variant="outline" onPress={onClose} fullWidth />
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
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  preview: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    padding: spacing[3],
    gap: spacing[2],
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
  },
  previewComment: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    lineHeight: fontSize.sm * 1.5,
    fontStyle: 'italic',
  },
  input: { minHeight: 120, textAlignVertical: 'top' },
  hint: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    lineHeight: fontSize.xs * 1.45,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[2],
    paddingTop: spacing[3],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
  },
  actionBtn: { flex: 1 },
});
