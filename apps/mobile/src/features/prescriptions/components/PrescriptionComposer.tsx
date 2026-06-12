import type { AppColors } from '@/theme/colors';
import { getThemedStyles } from '@/theme/use-themed-styles';
import { colors } from '@/theme';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { AlertTriangle, Download, Eye, FileOutput, Upload } from 'lucide-react-native';
import type { MedicalDocumentRow } from '@/features/appointments/detail/api/appointment-detail.service';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { MedicalDocumentPreviewModal } from '@/features/documents/components/MedicalDocumentPreviewModal';
import { cacheMedicalDocument, openMedicalDocument } from '@/lib/downloads/download-medical-document';
import { sharePdfFromBase64 } from '@/lib/downloads/share-pdf-base64';
import { useToast } from '@/providers/ToastProvider';
import { handleApiError } from '@/lib/errors/handle-api-error';
import {
  generatePrescriptionPdf,
  savePrescriptionPdfToAppointment,
  type PrescriptionKind,
} from '../api/prescriptions.service';
import { spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  appointmentId: string;
  documents: MedicalDocumentRow[];
  onDocumentsChanged?: () => void | Promise<void>;
  initialText?: string;
  embedded?: boolean;
  prescriptionKind?: PrescriptionKind;
}

export function PrescriptionComposer({
  appointmentId,
  documents,
  onDocumentsChanged,
  initialText = '',
  embedded = false,
  prescriptionKind = 'medical',
}: Props) {
  const { show: toast } = useToast();
  const qc = useQueryClient();
  const [text, setText] = useState(initialText);
  const [pdfUri, setPdfUri] = useState<string | undefined>();
  const [pdfFileName, setPdfFileName] = useState('ordonnance.pdf');
  const [pdfMeta, setPdfMeta] = useState<{
    prescription_number?: string;
    prescription_kind?: string;
  } | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const isNursing = prescriptionKind === 'nursing';
  const existingOrdonnance = useMemo(
    () => documents.find((d) => d.document_type === 'ordonnance'),
    [documents],
  );
  const hasExisting = Boolean(existingOrdonnance);
  const canGenerate = text.trim().length > 0;

  const generateMut = useMutation({
    mutationFn: () => generatePrescriptionPdf(appointmentId, text, prescriptionKind),
    onSuccess: async (res) => {
      if (!res.success || !res.data?.pdf_base64) {
        toast(res.error ?? 'Impossible de générer le PDF', { type: 'error' });
        return;
      }
      const name = res.data.file_name ?? 'ordonnance.pdf';
      setPdfFileName(name);
      setPdfMeta({
        prescription_number: res.data.prescription_number,
        prescription_kind: res.data.prescription_kind,
      });
      const shared = await sharePdfFromBase64(res.data.pdf_base64, name);
      if (!shared.ok) {
        toast(shared.error ?? 'Partage impossible', { type: 'error' });
        return;
      }
      setPdfUri(shared.localUri);
      toast('PDF généré — aperçu ou enregistrement sur le RDV', { type: 'success' });
    },
    onError: (e) => handleApiError(e, toast, 'generate-prescription'),
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!pdfUri) throw new Error('NO_PDF');
      return savePrescriptionPdfToAppointment(appointmentId, pdfUri, {
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
      toast('Ordonnance enregistrée sur le rendez-vous', { type: 'success' });
      void qc.invalidateQueries({ queryKey: ['prescriptions'] });
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
          <AlertTriangle size={16} color={colors.warning} strokeWidth={2} />
          <Text style={styles.warnText}>
            Une ordonnance est déjà enregistrée. Consultez-la, téléchargez-la ou modifiez le texte
            ci-dessous pour en régénérer une nouvelle.
          </Text>
          <View style={styles.warnActions}>
            <Button
              title="Voir"
              variant="outline"
              size="sm"
              leftIcon={<Eye size={14} color={colors.primary} strokeWidth={2} />}
              loading={previewExistingMut.isPending}
              onPress={() => previewExistingMut.mutate()}
            />
            <Button
              title="Télécharger"
              variant="outline"
              size="sm"
              leftIcon={<Download size={14} color={colors.primary} strokeWidth={2} />}
              loading={downloadMut.isPending}
              onPress={() => downloadMut.mutate()}
            />
          </View>
        </View>
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
          leftIcon={<FileOutput size={16} color={colors.textInverse} strokeWidth={2} />}
          loading={generateMut.isPending}
          disabled={!canGenerate}
          onPress={() => generateMut.mutate()}
        />
        {pdfUri && !hasExisting ? (
          <>
            <Button
              title="Aperçu"
              variant="outline"
              leftIcon={<Eye size={16} color={colors.primary} strokeWidth={2} />}
              onPress={() => setPreviewOpen(true)}
            />
            <Button
              title="Enregistrer sur le RDV"
              variant="outline"
              leftIcon={<Upload size={16} color={colors.primary} strokeWidth={2} />}
              loading={saveMut.isPending}
              onPress={() => saveMut.mutate()}
            />
          </>
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

  if (embedded) return content;

  return (
    <Card>
      <Text style={styles.cardTitle}>
        {isNursing ? 'Prescription d\'actes infirmiers' : 'Créer une ordonnance'}
      </Text>
      {content}
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
    warnActions: { flexDirection: 'row', gap: spacing[2], flexWrap: 'wrap' },
    textarea: { minHeight: 140, textAlignVertical: 'top' },
    actions: { gap: spacing[2] },
  };
}

const styles = new Proxy({} as Record<string, any>, {
  get(_target, prop: string | symbol) {
    if (typeof prop === 'string') {
      return getThemedStyles('features_prescriptions_components_PrescriptionComposer_tsx_styles', buildStyles)[prop];
    }
    return undefined;
  },
});
