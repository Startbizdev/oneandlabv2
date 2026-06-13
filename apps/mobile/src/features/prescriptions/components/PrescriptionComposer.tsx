import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';

import { useMemo, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import { Row } from '@/components/layout/primitives';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Download, Eye, FileOutput, PenLine, Upload } from 'lucide-react-native';
import dayjs from 'dayjs';
import type { MedicalDocumentRow } from '@/features/appointments/detail/api/appointment-detail.service';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { MedicalDocumentPreviewModal } from '@/features/documents/components/MedicalDocumentPreviewModal';
import { cacheMedicalDocument, openMedicalDocument } from '@/lib/downloads/download-medical-document';
import { cachePdfFromBase64 } from '@/lib/downloads/cache-pdf-base64';
import { useToast } from '@/providers/ToastProvider';
import { handleApiError } from '@/lib/errors/handle-api-error';
import {
  generatePrescriptionPdf,
  savePrescriptionPdf,
  type PrescriptionKind,
} from '../api/prescriptions.service';
import { PrescriptionSignatureSheet } from '@/features/prescriptions/components/PrescriptionSignatureSheet';
import { PrescriptionDatePicker } from '@/features/prescriptions/components/PrescriptionDatePicker';
import { fetchUser } from '@/features/profile/api/profile.service';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/store/auth-store';
import { spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  patientId: string;
  appointmentId?: string | null;
  documents?: MedicalDocumentRow[];
  onDocumentsChanged?: () => void | Promise<void>;
  initialText?: string;
  embedded?: boolean;
  prescriptionKind?: PrescriptionKind;
}

export function PrescriptionComposer({
  patientId,
  appointmentId = null,
  documents = [],
  onDocumentsChanged,
  initialText = '',
  embedded = false,
  prescriptionKind = 'medical',
}: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'features_prescriptions_components_PrescriptionComposer_tsx_styles');
  const { show: toast } = useToast();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [text, setText] = useState(initialText);
  const [prescriptionDate, setPrescriptionDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [includeSignature, setIncludeSignature] = useState(true);
  const [signatureSheetOpen, setSignatureSheetOpen] = useState(false);
  const [pendingGenerate, setPendingGenerate] = useState(false);
  const [pdfUri, setPdfUri] = useState<string | undefined>();
  const [pdfFileName, setPdfFileName] = useState('ordonnance.pdf');
  const [pdfMeta, setPdfMeta] = useState<{
    prescription_number?: string;
    prescription_kind?: string;
  } | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  const linkedToAppointment = Boolean(appointmentId);
  const isNursing = prescriptionKind === 'nursing';
  const existingOrdonnance = useMemo(
    () => (linkedToAppointment ? documents.find((d) => d.document_type === 'ordonnance') : undefined),
    [documents, linkedToAppointment],
  );
  const hasExisting = Boolean(existingOrdonnance);
  const canGenerate = Boolean(patientId?.trim()) && text.trim().length > 0;

  const profileQ = useQuery({
    queryKey: queryKeys.profile.user(user?.id ?? ''),
    queryFn: async () => (await fetchUser(user!.id, 'full')).data,
    enabled: !!user?.id,
  });

  const hasSignature = Boolean(profileQ.data?.prescription_signature_png);

  const runGenerate = () => {
    generateMut.mutate();
  };

  const openSignatureSheet = () => {
    Keyboard.dismiss();
    setSignatureSheetOpen(true);
  };

  const onPressGenerate = () => {
    if (includeSignature && !hasSignature) {
      setPendingGenerate(true);
      openSignatureSheet();
      return;
    }
    runGenerate();
  };

  const generateMut = useMutation({
    mutationFn: async () => {
      const res = await generatePrescriptionPdf({
        patientId,
        prescriptionText: text,
        prescriptionKind,
        appointmentId: appointmentId ?? undefined,
        prescriptionDate,
        includeHandwrittenSignature: includeSignature,
      });
      if (!res.success || !res.data?.pdf_base64) {
        throw new Error(res.error ?? 'Impossible de générer le PDF');
      }

      const name = res.data.file_name ?? 'ordonnance.pdf';
      const meta = {
        prescription_number: res.data.prescription_number,
        prescription_kind: res.data.prescription_kind,
      };
      const cached = await cachePdfFromBase64(res.data.pdf_base64, name);
      if (!cached.ok || !cached.localUri) {
        throw new Error(cached.error ?? 'Impossible d’afficher le PDF');
      }

      const saveRes = await savePrescriptionPdf(cached.localUri, {
        patientId,
        appointmentId: appointmentId ?? undefined,
        fileName: name,
        prescriptionKind,
        prescriptionText: text.trim(),
        prescriptionNumber: meta.prescription_number,
      });

      return { cached, name, meta, saveOk: saveRes.success, saveError: saveRes.error };
    },
    onSuccess: async ({ cached, name, meta, saveOk, saveError }) => {
      setPdfFileName(name);
      setPdfMeta(meta);
      setPdfUri(cached.localUri);
      setSaveFailed(!saveOk);
      setPreviewOpen(true);

      if (saveOk) {
        toast(
          linkedToAppointment
            ? 'Ordonnance enregistrée sur le rendez-vous'
            : 'Ordonnance enregistrée dans l’historique',
          { type: 'success' },
        );
        await qc.invalidateQueries({ queryKey: ['prescriptions'] });
        await onDocumentsChanged?.();
      } else {
        toast(saveError ?? 'PDF généré — enregistrement impossible, réessayez', {
          type: 'error',
        });
      }
    },
    onError: (e) => handleApiError(e, toast, 'generate-prescription'),
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!pdfUri) throw new Error('NO_PDF');
      return savePrescriptionPdf(pdfUri, {
        patientId,
        appointmentId: appointmentId ?? undefined,
        fileName: pdfFileName,
        prescriptionKind,
        prescriptionText: text.trim(),
        prescriptionNumber: pdfMeta?.prescription_number,
      });
    },
    onSuccess: async (res) => {
      if (!res.success) {
        toast(res.error ?? "Impossible d'enregistrer", { type: 'error' });
        return;
      }
      setPdfUri(undefined);
      setPdfMeta(null);
      setSaveFailed(false);
      toast(
        linkedToAppointment
          ? 'Ordonnance enregistrée sur le rendez-vous'
          : 'Ordonnance enregistrée dans l’historique',
        { type: 'success' },
      );
      await qc.invalidateQueries({ queryKey: ['prescriptions'] });
      await onDocumentsChanged?.();
    },
    onError: (e) => handleApiError(e, toast, 'save-prescription'),
  });

  const downloadMut = useMutation({
    mutationFn: async () => {
      if (!existingOrdonnance?.id) throw new Error('NO_DOC');
      return openMedicalDocument(existingOrdonnance.id, existingOrdonnance.file_name);
    },
    onSuccess: (r) => {
      if (!r.ok) toast(r.error ?? 'Ouverture impossible', { type: 'error' });
    },
    onError: (e) => handleApiError(e, toast, 'download-prescription'),
  });

  const previewExistingMut = useMutation({
    mutationFn: async () => {
      if (!existingOrdonnance?.id) throw new Error('NO_DOC');
      return cacheMedicalDocument(existingOrdonnance.id, existingOrdonnance.file_name);
    },
    onSuccess: (r) => {
      if (!r.ok || !r.localUri) {
        toast(r.error ?? 'Aperçu impossible', { type: 'error' });
        return;
      }
      setPdfUri(r.localUri);
      setPdfFileName(existingOrdonnance?.file_name ?? 'ordonnance.pdf');
      setPreviewOpen(true);
    },
    onError: (e) => handleApiError(e, toast, 'preview-prescription'),
  });

  const content = (
    <View style={styles.inner}>
      {hasExisting ? (
        <View style={styles.warn}>
          <AlertTriangle size={16} color={c.warning} strokeWidth={2} />
          <Text style={styles.warnText}>
            Une ordonnance est déjà enregistrée sur ce rendez-vous. Consultez-la ou régénérez-en une
            nouvelle ci-dessous.
          </Text>
          <Row wrap gap={spacing[2]} style={styles.warnActions}>
            <Button
              title="Voir"
              variant="outline"
              size="sm"
              leftIcon={<Eye size={14} color={c.primary} strokeWidth={2} />}
              loading={previewExistingMut.isPending}
              onPress={() => previewExistingMut.mutate()}
            />
            <Button
              title="Télécharger"
              variant="outline"
              size="sm"
              leftIcon={<Download size={14} color={c.primary} strokeWidth={2} />}
              loading={downloadMut.isPending}
              onPress={() => downloadMut.mutate()}
            />
          </Row>
        </View>
      ) : null}

      <PrescriptionDatePicker value={prescriptionDate} onChange={setPrescriptionDate} />

      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: includeSignature }}
        onPress={() => setIncludeSignature((v) => !v)}
        style={styles.signRow}
      >
        <View style={[styles.checkbox, includeSignature && styles.checkboxOn]}>
          {includeSignature ? <Text style={styles.checkMark}>✓</Text> : null}
        </View>
        <View style={styles.signRowText}>
          <Text style={styles.signLabel}>Inclure ma signature manuscrite</Text>
          <Text style={styles.signHint}>
            {hasSignature
              ? 'Signature enregistrée sur votre compte'
              : 'Vous serez invité à signer avant génération'}
          </Text>
        </View>
        <PenLine size={18} color={c.textSecondary} strokeWidth={2} />
      </Pressable>

      {includeSignature && hasSignature && user?.id ? (
        <Button
          title="Modifier ma signature"
          variant="outline"
          size="sm"
          onPress={openSignatureSheet}
        />
      ) : null}

      <Input
        label={
          isNursing
            ? 'Actes de soins infirmiers'
            : 'Prescription (médicaments, posologie, durée…)'
        }
        value={text}
        onChangeText={setText}
        multiline
        placeholder={
          isNursing
            ? 'Ex. Pansement quotidien — surveillance plaie…'
            : 'Ex. Doliprane 1000 mg — 1 cp × 3/jour pendant 5 jours…'
        }
        style={styles.textarea}
      />

      <View style={styles.actions}>
        <Button
          title="Générer le PDF"
          leftIcon={<FileOutput size={16} color={c.textInverse} strokeWidth={2} />}
          loading={generateMut.isPending}
          disabled={!canGenerate}
          onPress={onPressGenerate}
        />
        {pdfUri && !hasExisting && saveFailed ? (
          <>
            <Button
              title="Aperçu"
              variant="outline"
              leftIcon={<Eye size={16} color={c.primary} strokeWidth={2} />}
              onPress={() => setPreviewOpen(true)}
            />
            <Button
              title={linkedToAppointment ? 'Enregistrer sur le RDV' : 'Enregistrer'}
              variant="outline"
              leftIcon={<Upload size={16} color={c.primary} strokeWidth={2} />}
              loading={saveMut.isPending}
              onPress={() => saveMut.mutate()}
            />
          </>
        ) : pdfUri && !hasExisting ? (
          <Button
            title="Aperçu"
            variant="outline"
            leftIcon={<Eye size={16} color={c.primary} strokeWidth={2} />}
            onPress={() => setPreviewOpen(true)}
          />
        ) : null}
      </View>

      <MedicalDocumentPreviewModal
        visible={previewOpen}
        localUri={pdfUri ?? null}
        fileName={pdfFileName}
        onClose={() => setPreviewOpen(false)}
      />
    </View>
  );

  if (embedded) {
    return (
      <>
        {content}
        {user?.id ? (
          <PrescriptionSignatureSheet
            visible={signatureSheetOpen}
            onClose={() => {
              setSignatureSheetOpen(false);
              setPendingGenerate(false);
            }}
            userId={user.id}
            initialPng={profileQ.data?.prescription_signature_png}
            onSaved={() => {
              if (pendingGenerate) {
                setPendingGenerate(false);
                runGenerate();
              }
            }}
          />
        ) : null}
      </>
    );
  }

  return (
    <Card>
      <Text style={styles.cardTitle}>
        {isNursing ? "Prescription d'actes infirmiers" : 'Créer une ordonnance'}
      </Text>
      {content}
      {user?.id ? (
        <PrescriptionSignatureSheet
          visible={signatureSheetOpen}
          onClose={() => {
            setSignatureSheetOpen(false);
            setPendingGenerate(false);
          }}
          userId={user.id}
          initialPng={profileQ.data?.prescription_signature_png}
          onSaved={() => {
            if (pendingGenerate) {
              setPendingGenerate(false);
              runGenerate();
            }
          }}
        />
      ) : null}
    </Card>
  );
}

function buildStyles(c: AppColors) {
  return {
    cardTitle: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.base,
      color: c.textPrimary,
      marginBottom: spacing[3],
    },
    inner: { gap: spacing[3] },
    warn: {
      gap: spacing[2],
      backgroundColor: c.warningLight,
      borderRadius: 12,
      padding: spacing[3],
    },
    warnText: {
      fontFamily: fontFamily.medium,
      fontSize: fontSize.sm,
      color: c.warning,
      lineHeight: fontSize.sm * 1.45,
    },
    warnActions: {
      minWidth: 0,
    },
    textarea: { minHeight: 140, textAlignVertical: 'top' as const },
    signRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing[2.5],
      paddingVertical: spacing[1],
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: c.borderLight,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    checkboxOn: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    checkMark: {
      color: c.textInverse,
      fontSize: 14,
      fontFamily: fontFamily.bold,
    },
    signRowText: { flex: 1, minWidth: 0 },
    signLabel: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.sm,
      color: c.textPrimary,
    },
    signHint: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.xs,
      color: c.textSecondary,
      marginTop: 2,
    },
    actions: { gap: spacing[2] },
  };
}

