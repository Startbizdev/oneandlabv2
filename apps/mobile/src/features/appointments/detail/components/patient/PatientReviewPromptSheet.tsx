import type { Appointment } from '@oneandlab/shared-types';
import { Text, View } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { RatingStars } from '@/features/reviews/components/RatingStars';
import type { UseMutationResult } from '@tanstack/react-query';
import {
  revieweeFirstName,
  type ReviewFormState,
  type ReviewRow,
} from './use-patient-review-prompt';
import { useThemedStyles } from '@/theme/use-themed-styles';
import type { AppColors } from '@/theme/colors';
import { fontFamily, fontSize } from '@/theme/typography';
import { spacing } from '@/theme';

interface Props {
  visible: boolean;
  appt: Appointment | null;
  existing?: ReviewRow;
  form: ReviewFormState | null;
  onClose: () => void;
  onRatingChange: (rating: number) => void;
  onCommentChange: (comment: string) => void;
  submitReview: UseMutationResult<unknown, Error, { apptId: string; rating: number; comment: string }>;
}

export function PatientReviewPromptSheet({
  visible,
  appt,
  existing,
  form,
  onClose,
  onRatingChange,
  onCommentChange,
  submitReview,
}: Props) {
  const sheetStyles = useThemedStyles(buildSheetStyles, 'PatientReviewPromptSheet');
  if (!appt) return null;

  const proName = revieweeFirstName(appt);
  const isReadOnly = Boolean(existing);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={isReadOnly ? 'Mon avis' : 'Laisser un avis'}
      subtitle={
        isReadOnly
          ? (appt.category_name ?? 'Soin')
          : proName
            ? `Soin avec ${proName}`
            : 'Partagez votre expérience'
      }
    >
      {isReadOnly && existing ? (
        <View style={sheetStyles.body}>
          <RatingStars value={existing.rating ?? 0} readonly size="lg" centered />
          {existing.comment?.trim() ? (
            <Text style={sheetStyles.comment}>{existing.comment.trim()}</Text>
          ) : (
            <Text style={sheetStyles.commentMuted}>Pas de commentaire</Text>
          )}
          <Button title="Fermer" variant="outline" onPress={onClose} fullWidth size="lg" />
        </View>
      ) : null}

      {!isReadOnly && form ? (
        <View style={sheetStyles.body}>
          <Text style={sheetStyles.hint}>
            Votre note aide la communauté Cary à choisir les bons professionnels.
          </Text>
          <RatingStars
            value={form.rating}
            onChange={onRatingChange}
            size="lg"
            centered
          />
          <Textarea
            label="Commentaire (optionnel)"
            hint="Accueil, ponctualité, qualité des soins…"
            value={form.comment}
            onChangeText={onCommentChange}
            placeholder="Ex. : professionnel à l'écoute, soin effectué avec douceur…"
          />
          <Button
            title="Publier mon avis"
            size="lg"
            fullWidth
            loading={submitReview.isPending}
            onPress={() =>
              submitReview.mutate({
                apptId: appt.id,
                rating: form.rating,
                comment: form.comment,
              })
            }
          />
        </View>
      ) : null}
    </BottomSheet>
  );
}

function buildSheetStyles(c: AppColors) {
  return {
    body: { gap: spacing[3] },
    hint: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.sm,
      color: c.textSecondary,
      lineHeight: fontSize.sm * 1.45,
      textAlign: 'center' as const,
    },
    comment: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.base,
      color: c.textPrimary,
      lineHeight: fontSize.base * 1.45,
    },
    commentMuted: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.sm,
      color: c.textTertiary,
      fontStyle: 'italic' as const,
    },
  };
}
