import { useState } from 'react';
import { Image, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Row } from '@/components/layout/primitives';
import { Button } from '@/components/ui/Button';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { ProfileSection } from '@/features/profile/components/ProfileSection';
import { updateUser } from '@/features/profile/api/profile.service';
import { PrescriptionSignatureSheet } from '@/features/prescriptions/components/PrescriptionSignatureSheet';
import { queryKeys } from '@/lib/query-keys';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { useToast } from '@/providers/ToastProvider';
import { radius, spacing, AppText, useStyles, type Theme } from '@/theme';

type Props = {
  userId: string;
  signaturePng?: string | null;
};

export function ProfilePrescriptionSignatureSection({ userId, signaturePng }: Props) {
  const styles = useStyles(buildStyles);
  const { show: toast } = useToast();
  const qc = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const saveMut = useMutation({
    mutationFn: (png: string | null) =>
      updateUser(userId, { prescription_signature_png: png }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: queryKeys.profile.user(userId) });
      setConfirmDeleteOpen(false);
      toast('Signature supprimée', { type: 'success' });
    },
    onError: (e) => handleApiError(e, toast, 'prescription-signature'),
  });

  const previewUri = signaturePng
    ? signaturePng.startsWith('data:')
      ? signaturePng
      : `data:image/png;base64,${signaturePng}`
    : null;

  return (
    <>
      <ProfileSection
        title="Signature des ordonnances"
        description="Apposée sur vos ordonnances quand vous choisissez de signer."
      >
        {previewUri ? (
          <View style={styles.previewWrap}>
            <Image
              source={{ uri: previewUri }}
              style={styles.preview}
              resizeMode="contain"
              accessibilityLabel="Aperçu de votre signature"
            />
          </View>
        ) : (
          <AppText variant="secondary">Aucune signature enregistrée.</AppText>
        )}
        <Row gap={spacing[2]} wrap>
          <Button
            title={previewUri ? 'Modifier' : 'Créer ma signature'}
            variant="secondary"
            size="md"
            onPress={() => setSheetOpen(true)}
          />
          {previewUri ? (
            <Button
              title="Supprimer"
              variant="ghost"
              size="md"
              onPress={() => setConfirmDeleteOpen(true)}
            />
          ) : null}
        </Row>
      </ProfileSection>

      <PrescriptionSignatureSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        userId={userId}
        initialPng={signaturePng}
        onSaved={() => setSheetOpen(false)}
      />

      <ConfirmSheet
        visible={confirmDeleteOpen}
        title="Supprimer la signature ?"
        message="Vous pourrez en créer une nouvelle à tout moment."
        confirmLabel="Supprimer"
        tone="destructive"
        loading={saveMut.isPending}
        onConfirm={() => saveMut.mutate(null)}
        onClose={() => setConfirmDeleteOpen(false)}
      />
    </>
  );
}

function buildStyles({ colors: c }: Theme) {
  return {
    previewWrap: {
      borderWidth: 1,
      borderColor: c.borderLight,
      borderRadius: radius.md,
      padding: spacing[2],
      backgroundColor: c.surface,
    },
    preview: {
      width: '100%' as const,
      height: 72,
    },
  };
}
