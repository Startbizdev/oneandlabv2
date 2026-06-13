import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { Keyboard, StyleSheet, Text, View } from 'react-native';
import { Image as ImageIcon } from 'lucide-react-native';
import {
  CANCELLATION_COMMENT_MAX_LENGTH,
  CANCELLATION_COMMENT_MIN_LENGTH,
  CANCELLATION_REASON_OPTIONS,
  cancellationReasonRequiresPhoto,
  staffCancellationCanSubmit,
} from '@oneandlab/shared-constants';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SelectField } from '@/components/ui/SelectField';
import { spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

export type StaffCancellationValues = {
  reason: string;
  comment: string;
  photoUri?: string;
  photoName?: string;
  photoMimeType?: string;
};

interface Props {
  values: StaffCancellationValues;
  onChange: (patch: Partial<StaffCancellationValues>) => void;
  onPickPhoto: () => void;
}

export function StaffCancellationFields({ values, onChange, onPickPhoto }: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'features_appointments_detail_components_blocks_StaffCancellationFields_tsx_StaffCancellationFields_styles');

  const { reason, comment, photoUri } = values;
  const showPhoto = cancellationReasonRequiresPhoto(reason);
  const commentLen = comment.trim().length;
  const canSubmit = staffCancellationCanSubmit(reason, comment);

  return (
    <View style={styles.form}>
      <SelectField
        label="Raison d'annulation"
        value={reason}
        options={CANCELLATION_REASON_OPTIONS}
        onChange={(v) => onChange({ reason: v })}
        placeholder="Choisir une raison"
        sheetTitle="Raison d'annulation"
      />
      <Input
        label={`Précisez la situation (obligatoire, min. ${CANCELLATION_COMMENT_MIN_LENGTH} caractères)`}
        value={comment}
        onChangeText={(v) =>
          onChange({ comment: v.slice(0, CANCELLATION_COMMENT_MAX_LENGTH) })
        }
        multiline
        returnKeyType="done"
        blurOnSubmit
        onSubmitEditing={() => Keyboard.dismiss()}
        placeholder="Décrivez brièvement la situation…"
        error={
          comment.length > 0 && commentLen < CANCELLATION_COMMENT_MIN_LENGTH
            ? `Minimum ${CANCELLATION_COMMENT_MIN_LENGTH} caractères`
            : undefined
        }
      />
      <Text style={styles.counter}>
        {commentLen} / {CANCELLATION_COMMENT_MAX_LENGTH}
      </Text>
      {showPhoto ? (
        <View style={styles.photoBlock}>
          <Text style={styles.photoTitle}>Photo (optionnelle)</Text>
          <Text style={styles.photoHint}>
            Vous pouvez joindre une photo du lieu ou de l'accès si pertinent.
          </Text>
          <Button
            title={photoUri ? 'Photo ajoutée ✓' : 'Choisir une photo'}
            variant="outline"
            size="sm"
            leftIcon={<ImageIcon size={14} color={c.primary} strokeWidth={2} />}
            onPress={onPickPhoto}
          />
          {photoUri ? (
            <Button
              title="Retirer la photo"
              variant="ghost"
              size="sm"
              onPress={() => onChange({ photoUri: undefined, photoName: undefined, photoMimeType: undefined })}
            />
          ) : null}
        </View>
      ) : null}
      {!canSubmit && reason ? (
        <Text style={styles.hint}>
          Renseignez un commentaire d'au moins {CANCELLATION_COMMENT_MIN_LENGTH} caractères pour
          confirmer.
        </Text>
      ) : null}
    </View>
  );
}

export { staffCancellationCanSubmit };

function buildStyles(c: AppColors) {
  return {
  form: { gap: spacing[3] },
  counter: {
    marginTop: -spacing[2],
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: c.textTertiary,
  },
  photoBlock: { gap: spacing[2] },
  photoTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: c.textPrimary,
  },
  photoHint: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: c.textTertiary,
    lineHeight: fontSize.xs * 1.45,
  },
  hint: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: c.textSecondary,
  },
};
}
