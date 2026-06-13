import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { useRef, useState, useEffect, useCallback } from 'react';
import { Keyboard, Text, View } from 'react-native';
import { Row } from '@/components/layout/primitives';
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

export type OpenPrescriptionSignatureOptions = {
  /** Ouvre la sheet puis génère le PDF après enregistrement */
  pendingGenerate?: boolean;
  afterSave?: () => void;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  userId: string;
  initialPng?: string | null;
  pendingGenerate?: boolean;
  onSaved?: () => void;
};

function normalizePngBase64(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('data:')) {
    const idx = trimmed.indexOf(',');
    return idx >= 0 ? trimmed.slice(idx + 1) : trimmed;
  }
  return trimmed.replace(/\s/g, '');
}

export function PrescriptionSignatureSheet({
  visible,
  onClose,
  userId,
  initialPng,
  pendingGenerate = false,
  onSaved,
}: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'PrescriptionSignatureSheet');
  const { show: toast } = useToast();
  const qc = useQueryClient();
  const padRef = useRef<PrescriptionSignaturePadHandle>(null);
  const exportingRef = useRef(false);
  const clearedRef = useRef(false);
  const [exporting, setExporting] = useState(false);
  const [presentKey, setPresentKey] = useState(0);

  const hasStoredSignature = Boolean(initialPng?.trim());

  useEffect(() => {
    if (visible) {
      Keyboard.dismiss();
      clearedRef.current = false;
      exportingRef.current = false;
      setPresentKey((k) => k + 1);
    } else {
      exportingRef.current = false;
      setExporting(false);
    }
  }, [visible]);

  const saveMut = useMutation({
    mutationFn: (png: string | null) =>
      updateUser(userId, { prescription_signature_png: png }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: queryKeys.profile.user(userId) });
      toast(
        pendingGenerate ? 'Signature enregistrée' : 'Signature mise à jour',
        { type: 'success' },
      );
      onSaved?.();
      onClose();
    },
    onError: (e) => handleApiError(e, toast, 'prescription-signature'),
    onSettled: () => {
      exportingRef.current = false;
      setExporting(false);
    },
  });

  const finishExport = useCallback(
    (png: string | null) => {
      exportingRef.current = false;
      setExporting(false);
      if (!png) {
        if (initialPng?.trim() && !clearedRef.current) {
          saveMut.mutate(normalizePngBase64(initialPng));
          return;
        }
        toast('Dessinez votre signature avant de continuer', { type: 'error' });
        return;
      }
      saveMut.mutate(normalizePngBase64(png));
    },
    [initialPng, saveMut, toast],
  );

  const handleSave = () => {
    exportingRef.current = true;
    setExporting(true);
    padRef.current?.export();
  };

  const onExport = useCallback(
    (png: string | null) => {
      if (!exportingRef.current) return;
      finishExport(png);
    },
    [finishExport],
  );

  const handleDeleteStored = () => {
    clearedRef.current = true;
    saveMut.mutate(null);
  };

  return (
    <BottomSheet
      visible={visible}
      presentKey={presentKey}
      onClose={onClose}
      title={pendingGenerate ? 'Signer l’ordonnance' : 'Modifier ma signature'}
      subtitle={
        pendingGenerate
          ? 'Votre signature sera enregistrée sur votre compte'
          : 'Effacez, redessinez ou supprimez votre signature enregistrée'
      }
      disableScroll
      stackBehavior="replace"
      snapPoints={['72%']}
      keyboardBehavior="fillParent"
      footer={
        <View style={styles.footer}>
          <Button
            title={pendingGenerate ? 'Enregistrer et continuer' : 'Enregistrer'}
            loading={saveMut.isPending}
            onPress={handleSave}
          />
        </View>
      }
    >
      <Text style={styles.hint}>Signez dans la zone ci-dessous avec votre doigt ou un stylet.</Text>
      <PrescriptionSignaturePad
        key={presentKey}
        ref={padRef}
        initialPng={initialPng}
        onExport={onExport}
        height={220}
      />
      <Row wrap gap={spacing[2]} style={styles.actions}>
        <Button
          title="Effacer le dessin"
          variant="outline"
          size="sm"
          onPress={() => {
            clearedRef.current = true;
            padRef.current?.clear();
          }}
        />
        {hasStoredSignature && !pendingGenerate ? (
          <Button
            title="Supprimer ma signature"
            variant="outline"
            size="sm"
            loading={saveMut.isPending}
            onPress={handleDeleteStored}
          />
        ) : null}
      </Row>
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
    actions: {
      marginTop: spacing[2],
      minWidth: 0,
    },
  };
}
