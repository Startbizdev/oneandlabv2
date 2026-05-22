import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { pickMedicalDocumentFile } from '@/lib/uploads/pick-medical-document';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload } from 'lucide-react-native';
import { queryKeys } from '@/lib/query-keys';
import { useToast } from '@/providers/ToastProvider';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { buildMedicalDocumentForm, uploadFormData } from '@/lib/uploads/upload-file';
import {
  canUploadLabResultatsForAppointmentStatus,
  canUploadMedicalDocumentsForAppointmentStatus,
} from '@/utils/appointment-documents-upload';
import type { Appointment } from '@oneandlab/shared-types';
import { DocumentsBlock } from './DocumentsBlock';
import type { MedicalDocumentRow } from '../api/appointment-detail.service';
import { getDocumentTypeLabel } from '../utils/document-labels';
import { colors, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

const PATIENT_TYPES = [
  'carte_vitale',
  'carte_mutuelle',
  'ordonnance',
  'autres_assurances',
  'other',
] as const;

const PRO_TYPES = [...PATIENT_TYPES] as const;

const LAB_RESULT_TYPES = ['resultats'] as const;

interface Props {
  appointmentId: string;
  apt: Appointment;
  role: string;
  docs: MedicalDocumentRow[];
  loading?: boolean;
  omitCarePhotos?: boolean;
}

export function DetailDocumentsSection({
  appointmentId,
  apt,
  role,
  docs,
  loading,
  omitCarePhotos,
}: Props) {
  const { show: toast } = useToast();
  const qc = useQueryClient();
  const [uploading, setUploading] = useState<string | null>(null);

  const canUpload = canUploadMedicalDocumentsForAppointmentStatus(apt.status);
  const canResultats =
    (role === 'pro' || role === 'lab') &&
    apt.type === 'blood_test' &&
    canUploadLabResultatsForAppointmentStatus(apt.status);

  const uploadTypes =
    role === 'patient'
      ? PATIENT_TYPES
      : canResultats
        ? [...PRO_TYPES, ...LAB_RESULT_TYPES]
        : PRO_TYPES;

  const uploadMut = useMutation({
    mutationFn: async ({
      docType,
      uri,
      name,
      mimeType,
    }: {
      docType: string;
      uri: string;
      name: string;
      mimeType: string;
    }) => {
      const fd = await buildMedicalDocumentForm(
        { uri, fileName: name, mimeType },
        { appointment_id: appointmentId, document_type: docType },
      );
      await uploadFormData('/medical-documents', fd);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.documents.medical(appointmentId) });
      toast('Document envoyé', { type: 'success' });
    },
    onError: (e) => handleApiError(e, toast, 'upload-doc'),
    onSettled: () => setUploading(null),
  });

  const pickAndUpload = useCallback(
    async (docType: string) => {
      if (!canUpload || uploading) return;
      try {
        const picked = await pickMedicalDocumentFile();
        if (!picked) return;
        setUploading(docType);
        uploadMut.mutate({
          docType,
          uri: picked.uri,
          name: picked.fileName,
          mimeType: picked.mimeType,
        });
      } catch (e) {
        handleApiError(e, toast, 'pick-doc');
      }
    },
    [canUpload, uploadMut, uploading, toast],
  );

  const filteredDocs =
    role === 'patient'
      ? docs.filter((d) => d.document_type !== 'cancellation_photo')
      : docs;

  return (
    <View style={styles.wrap}>
      <DocumentsBlock
        docs={filteredDocs}
        loading={loading}
        omitCarePhotos={omitCarePhotos}
        appointmentId={appointmentId}
      />
      {canUpload ? (
        <View style={styles.uploadZone}>
          <Text style={styles.uploadTitle}>Ajouter un document</Text>
          {uploadTypes.map((t) => (
            <Pressable
              key={t}
              style={styles.uploadRow}
              disabled={uploading === t}
              onPress={() => void pickAndUpload(t)}
            >
              <Upload size={16} color={colors.primary} strokeWidth={2} />
              <Text style={styles.uploadLabel}>
                {uploading === t ? 'Envoi…' : getDocumentTypeLabel(t)}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing[3] },
  uploadZone: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[3],
    gap: spacing[2],
  },
  uploadTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  uploadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[2],
  },
  uploadLabel: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
});
