import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import {
  PrescriptionSignaturePad,
  type PrescriptionSignaturePadHandle,
} from '@/features/prescriptions/components/PrescriptionSignaturePad';
import { updateUser } from '@/features/profile/api/profile.service';
import { queryKeys } from '@/lib/query-keys';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { useToast } from '@/providers/ToastProvider';
import { spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

type Props = {
  visible: boolean;
  onClose: () => void;
  userId: string;
  initialPng?: string | null;
  onSaved?: () => void;
};

export function PrescriptionSignatureSheet({
  visible,
  onClose,
  userId,
  initialPng,
  onSaved,
}: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'PrescriptionSignatureSheet');
  const { show: toast } = useToast();
  const qc = useQueryClient();
  const padRef = useRef<PrescriptionSignaturePadHandle>(null);
  const [exporting, setExporting] = useState(false);

  const saveMut = useMutation({
    mutationFn: (png: string | null) =>
      updateUser(userId, { prescription_signature_png: png }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: queryKeys.profile.user(userId) });
      toast('Signature enregistrée', { type: 'success' });
      onSaved?.();
      onClose();
    },
    onError: (e) => handleApiError(e, toast, 'prescription-signature'),
    onSettled: () => setExporting(false),
  });

  const handleSave = () => {
    setExporting(true);
    padRef.current?.export();
  };

  const onExport = (png: string | null) => {
    if (!exporting) return;
    if (!png) {
      setExporting(false);
      toast('Dessinez votre signature avant de continuer', { type: 'error' });
      return;
    }
    saveMut.mutate(png);
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Signer l’ordonnance"
      subtitle="Votre signature sera enregistrée sur votre compte"
      footer={
        <View style={styles.footer}>
          <Button
            title="Enregistrer et continuer"
            loading={saveMut.isPending}
            onPress={handleSave}
          />
        </View>
      }
    >
      <Text style={styles.hint}>Signez dans la zone ci-dessous avec votre doigt ou un stylet.</Text>
      <PrescriptionSignaturePad ref={padRef} initialPng={initialPng} onExport={onExport} />
      <Button
        title="Effacer"
        variant="outline"
        size="sm"
        onPress={() => padRef.current?.clear()}
        style={styles.clearBtn}
      />
    </BottomSheet>
  );
}

function buildStyles(c: AppColors) {
  return {
    hint: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.sm,
      color: c.textSecondary,
      marginBottom: spacing[2],
      lineHeight: 20,
    },
    footer: { paddingTop: spacing[2] },
    clearBtn: { marginTop: spacing[2], alignSelf: 'flex-start' as const },
  };
}
