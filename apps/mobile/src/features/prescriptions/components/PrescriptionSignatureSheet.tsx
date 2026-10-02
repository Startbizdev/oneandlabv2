import { useRef, useState, useEffect, useCallback } from 'react';
import { Keyboard, View } from 'react-native';
import { Row } from '@/components/layout/primitives';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { SheetModal } from '@/components/ui/SheetModal';
import { Button } from '@/components/ui/Button';
import {
  PrescriptionSignaturePad,
  type PrescriptionSignaturePadHandle,
} from '@/features/prescriptions/components/PrescriptionSignaturePad';
import { updateUser } from '@/features/profile/api/profile.service';
import { queryKeys } from '@/lib/query-keys';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { useToast } from '@/providers/ToastProvider';
import { spacing, AppText, useStyles, font, type Theme } from '@/theme';
import { normalizeSignaturePngBase64 } from '@/features/prescriptions/lib/signature-pad-html';

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
  return normalizeSignaturePngBase64(raw) ?? '';
}

export function PrescriptionSignatureSheet({
  visible,
  onClose,
  userId,
  initialPng,
  pendingGenerate = false,
  onSaved,
}: Props) {
  const styles = useStyles(buildStyles);
  const { show: toast } = useToast();
  const qc = useQueryClient();
  const padRef = useRef<PrescriptionSignaturePadHandle>(null);
  const exportingRef = useRef(false);
  const clearedRef = useRef(false);
  const [exporting, setExporting] = useState(false);

  const hasStoredSignature = Boolean(initialPng?.trim());
  const normalizedInitial = normalizeSignaturePngBase64(initialPng);

  useEffect(() => {
    if (visible) {
      Keyboard.dismiss();
      clearedRef.current = false;
      exportingRef.current = false;
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

  const busy = exporting || saveMut.isPending;

  const handleDeleteStored = () => {
    clearedRef.current = true;
    saveMut.mutate(null);
  };

  return (
    <SheetModal
      visible={visible}
      onClose={onClose}
      title={pendingGenerate ? 'Signer l’ordonnance' : 'Modifier ma signature'}
      subtitle={
        pendingGenerate
          ? 'Votre signature sera enregistrée sur votre compte'
          : 'Effacez, redessinez ou supprimez votre signature enregistrée'
      }
      disableScroll
      // Le tracé dans la WebView ne doit pas tirer la sheet vers le bas : fermeture par « Annuler » uniquement.
      dismissible={false}
      footer={
        <View style={styles.footer}>
          <Button
            title={pendingGenerate ? 'Enregistrer et continuer' : 'Enregistrer'}
            loading={busy}
            onPress={handleSave}
          />
          <Button title="Annuler" variant="ghost" disabled={busy} onPress={onClose} />
        </View>
      }
    >
      <AppText style={styles.hint}>Signez dans la zone ci-dessous avec votre doigt ou un stylet.</AppText>
      <PrescriptionSignaturePad
        ref={padRef}
        initialPng={normalizedInitial}
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
    </SheetModal>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    hint: {
      ...font.regular,
      fontSize: fontSize.sm,
      color: c.textSecondary,
      marginBottom: spacing[2],
      lineHeight: 20,
    },
    footer: { gap: spacing[2] },
    actions: {
      marginTop: spacing[2],
      minWidth: 0,
    },
  };
}
