import { useAppColors } from '@/theme/use-app-colors';
import { useCallback, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import {
  medicalDocumentPickErrorMessage,
  pickMedicalDocumentFile,
} from '@/lib/uploads/pick-medical-document';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Appointment } from '@oneandlab/shared-types';
import { queryKeys } from '@/lib/query-keys';
import { useToast } from '@/providers/ToastProvider';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { uploadMedicalDocument } from '@/lib/uploads/upload-file';
import {
  canUploadLabResultatsForAppointmentStatus,
  canUploadMedicalDocumentsForAppointmentStatus,
} from '@/utils/appointment-documents-upload';
import type { MedicalDocumentRow } from '../api/appointment-detail.service';
import { filterListDocuments } from '../utils/document-labels';
import { getRdvDetailSectionStyles } from './layout/rdv-detail-section-styles';
import {
  MedicalDocumentAddRow,
  MedicalDocumentOpenRowContainer,
  MedicalDocumentsStackHead,
  buildDocumentStackRows,
  filterUploadTypesForStack,
  useMedicalDocumentsStackHeadStyles,
} from '@/features/documents/components/medical-documents-stack';
import { MedicalDocumentPreviewModal } from '@/features/documents/components/MedicalDocumentPreviewModal';
import { fontFamily, fontSize } from '@/theme/typography';

const PATIENT_TYPES = [
  'carte_vitale',
  'carte_mutuelle',
  'ordonnance',
  'autres_assurances',
  'other',
] as const;

const STAFF_TYPES = [...PATIENT_TYPES] as const;

interface Props {
  appointmentId: string;
  apt: Appointment;
  role: string;
  docs: MedicalDocumentRow[];
  loading?: boolean;
  omitCarePhotos?: boolean;
  embedded?: boolean;
}

function uploadTypesForRole(role: string, apt: Appointment): readonly string[] {
  if (role === 'patient') return PATIENT_TYPES;
  const base = [...STAFF_TYPES];
  if (
    (role === 'pro' || role === 'lab') &&
    apt.type === 'blood_test' &&
    canUploadLabResultatsForAppointmentStatus(apt.status)
  ) {
    return [...base, 'resultats'];
  }
  return base;
}

export function RdvDocumentsPremiumPanel({
  appointmentId,
  apt,
  role,
  docs,
  loading,
  omitCarePhotos = true,
}: Props) {
  const c = useAppColors();
  const section = getRdvDetailSectionStyles();
  const headStyles = useMedicalDocumentsStackHeadStyles();
  const { show: toast } = useToast();
  const qc = useQueryClient();
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ uri: string; fileName?: string } | null>(null);

  const canUpload = canUploadMedicalDocumentsForAppointmentStatus(apt.status);
  const orderedTypes = useMemo(() => uploadTypesForRole(role, apt), [role, apt]);

  const list = useMemo(
    () =>
      filterListDocuments(
        docs.filter((d) =>
          role === 'patient' ? d.document_type !== 'cancellation_photo' : true,
        ),
        { omitCarePhotos },
      ),
    [docs, omitCarePhotos, role],
  );

  const existingTypes = useMemo(
    () => new Set(list.map((d) => d.document_type)),
    [list],
  );

  const uploadTypesFiltered = useMemo(() => {
    if (!canUpload) return [];
    return filterUploadTypesForStack(orderedTypes, existingTypes);
  }, [canUpload, orderedTypes, existingTypes]);

  const stackRows = useMemo(
    () => buildDocumentStackRows(list, orderedTypes, uploadTypesFiltered),
    [list, orderedTypes, uploadTypesFiltered],
  );

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
      await uploadMedicalDocument(
        { uri, fileName: name, mimeType },
        { appointment_id: appointmentId, document_type: docType },
      );
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.documents.medical(appointmentId) });
      toast('Document envoyé', { type: 'success' });
    },
    onError: (e) => handleApiError(e, toast, 'upload-doc'),
    onSettled: () => setUploadingType(null),
  });

  const runUploadForType = useCallback(
    async (docType: string) => {
      if (!canUpload || uploadingType) return;
      try {
        const picked = await pickMedicalDocumentFile();
        if (!picked) return;
        setUploadingType(docType);
        await uploadMut.mutateAsync({
          docType,
          uri: picked.uri,
          name: picked.fileName,
          mimeType: picked.mimeType,
        });
      } catch (e) {
        toast(medicalDocumentPickErrorMessage(e), { type: 'error' });
      }
    },
    [canUpload, uploadMut, uploadingType, toast],
  );

  const handlePreview = useCallback((localUri: string, fileName?: string) => {
    setPreview({ uri: localUri, fileName });
  }, []);

  const headSubtitle = useMemo(() => {
    if (list.length > 0) {
      return `${list.length} pièce${list.length > 1 ? 's' : ''} jointe${list.length > 1 ? 's' : ''}`;
    }
    return 'Appuyez sur une ligne pour ajouter, télécharger ou prévisualiser';
  }, [list.length]);

  const hasProfileNewerAlert = useMemo(
    () => list.some((d) => d.profile_newer_than_appointment),
    [list],
  );

  if (loading) {
    return (
      <MedicalDocumentsStackHead
        title="Documents médicaux"
        subtitle=""
        loading
      />
    );
  }

  return (
    <>
      <View style={section.card}>
        <MedicalDocumentsStackHead title="Documents médicaux" subtitle={headSubtitle} />

        {hasProfileNewerAlert ? (
          <View style={dossierStyles.alert}>
            <Text style={[dossierStyles.alertText, { color: c.textSecondary }]}>
              Certains documents proviennent du profil patient et sont plus récents que la version
              attachée au rendez-vous.
            </Text>
          </View>
        ) : null}

        {stackRows.length === 0 ? (
          <View style={headStyles.emptyRow}>
            <Text style={[headStyles.emptyText, { color: c.textSecondary }]}>
              {canUpload
                ? 'Aucun document disponible pour ce rendez-vous.'
                : 'Les documents ne peuvent plus être modifiés.'}
            </Text>
          </View>
        ) : (
          stackRows.map((row, index) => {
            const topBorder = index > 0;
            if (row.kind === 'open') {
              return (
                <MedicalDocumentOpenRowContainer
                  key={row.key}
                  doc={row.doc}
                  topBorder={topBorder}
                  cacheScopeKey={`apt:${appointmentId}`}
                  canReplace={canUpload}
                  onPreview={handlePreview}
                  onReplace={() => runUploadForType(row.doc.document_type)}
                />
              );
            }
            return (
              <MedicalDocumentAddRow
                key={row.key}
                docType={row.docType}
                topBorder={topBorder}
                uploading={uploadingType === row.docType}
                onAdd={(type) => void runUploadForType(type)}
              />
            );
          })
        )}
      </View>

      <MedicalDocumentPreviewModal
        visible={Boolean(preview)}
        localUri={preview?.uri ?? null}
        fileName={preview?.fileName}
        onClose={() => setPreview(null)}
      />
    </>
  );
}

const dossierStyles = {
  alert: {
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
  },
  alertText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    lineHeight: fontSize.xs * 1.45,
  },
};
