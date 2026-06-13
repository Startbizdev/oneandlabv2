import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { useRef, useState } from 'react';
import { Image, Text, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PenLine } from 'lucide-react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { ProfileSection } from '@/features/profile/components/ProfileSection';
import { updateUser } from '@/features/profile/api/profile.service';
import {
  PrescriptionSignaturePad,
  type PrescriptionSignaturePadHandle,
} from '@/features/prescriptions/components/PrescriptionSignaturePad';
import { queryKeys } from '@/lib/query-keys';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { useToast } from '@/providers/ToastProvider';
import { spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

type Props = {
  userId: string;
  signaturePng?: string | null;
};

export function ProfilePrescriptionSignatureSection({ userId, signaturePng }: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'ProfilePrescriptionSignatureSection');
  const { show: toast } = useToast();
  const qc = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const padRef = useRef<PrescriptionSignaturePadHandle>(null);
  const [exporting, setExporting] = useState(false);

  const saveMut = useMutation({
    mutationFn: (png: string | null) =>
      updateUser(userId, { prescription_signature_png: png }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: queryKeys.profile.user(userId) });
      toast('Signature enregistrée', { type: 'success' });
      setSheetOpen(false);
    },
    onError: (e) => handleApiError(e, toast, 'prescription-signature'),
    onSettled: () => setExporting(false),
  });

  const previewUri = signaturePng
    ? signaturePng.startsWith('data:')
      ? signaturePng
      : `data:image/png;base64,${signaturePng}`
    : null;

  const handleSave = () => {
    setExporting(true);
    padRef.current?.export();
  };

  const onExport = (png: string | null) => {
    if (!exporting) return;
    if (!png) {
      setExporting(false);
      toast('Dessinez votre signature avant d’enregistrer', { type: 'error' });
      return;
    }
    saveMut.mutate(png);
  };

  return (
    <ProfileSection title="Signature ordonnance" Icon={PenLine}>
      <Text style={styles.help}>
        Cette signature apparaît sur vos ordonnances lorsque vous choisissez de signer avant génération.
      </Text>
      {previewUri ? (
        <View style={styles.previewWrap}>
          <Image source={{ uri: previewUri }} style={styles.preview} resizeMode="contain" />
        </View>
      ) : (
        <Text style={styles.empty}>Aucune signature enregistrée</Text>
      )}
      <View style={styles.actions}>
        <Button
          title={previewUri ? 'Modifier' : 'Créer ma signature'}
          variant="outline"
          size="sm"
          onPress={() => setSheetOpen(true)}
        />
        {previewUri ? (
          <Button
            title="Supprimer"
            variant="outline"
            size="sm"
            loading={saveMut.isPending}
            onPress={() => saveMut.mutate(null)}
          />
        ) : null}
      </View>

      <BottomSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Signature manuscrite"
        subtitle="Utilisée sur vos ordonnances PDF"
        footer={
          <View style={styles.footer}>
            <Button title="Enregistrer" loading={saveMut.isPending} onPress={handleSave} />
          </View>
        }
      >
        <PrescriptionSignaturePad
          ref={padRef}
          initialPng={signaturePng}
          onExport={onExport}
        />
        <Button
          title="Effacer"
          variant="outline"
          size="sm"
          onPress={() => padRef.current?.clear()}
          style={styles.clearBtn}
        />
      </BottomSheet>
    </ProfileSection>
  );
}

function buildStyles(c: AppColors) {
  return {
    help: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.sm,
      color: c.textSecondary,
      lineHeight: 20,
      marginBottom: spacing[2],
    },
    empty: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.sm,
      color: c.textTertiary,
      marginBottom: spacing[2],
    },
    previewWrap: {
      borderWidth: 1,
      borderColor: c.borderLight,
      borderRadius: 12,
      padding: spacing[2],
      backgroundColor: c.surface,
      marginBottom: spacing[2],
    },
    preview: {
      width: '100%' as const,
      height: 72,
    },
    actions: { flexDirection: 'row' as const, gap: spacing[2], flexWrap: 'wrap' as const },
    footer: { paddingTop: spacing[2] },
    clearBtn: { marginTop: spacing[2], alignSelf: 'flex-start' as const },
  };
}
