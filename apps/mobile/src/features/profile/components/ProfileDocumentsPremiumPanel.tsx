import { useAppColors } from '@/theme/use-app-colors';
import { useCallback, useMemo, useState } from 'react';
import { View, Text } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  medicalDocumentPickErrorMessage,
  pickMedicalDocumentFile,
} from '@/lib/uploads/pick-medical-document';
import {
  PATIENT_PROFILE_UPLOAD_TYPES,
  fetchProfileDocuments,
  filterCoverageProfileDocuments,
  mergePatientDocumentRow,
  uploadPatientProfileDocument,
  type PatientDocumentRow,
  type PatientProfileUploadType,
} from '@/features/patients/api/patient-profile.service';
import { queryKeys } from '@/lib/query-keys';
import { useToast } from '@/providers/ToastProvider';
import { useAuthStore } from '@/store/auth-store';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { getRdvDetailSectionStyles } from '@/features/appointments/detail/components/layout/rdv-detail-section-styles';
import {
  MedicalDocumentAddRow,
  MedicalDocumentOpenRowContainer,
  MedicalDocumentsStackHead,
  buildDocumentStackRows,
  filterUploadTypesForStack,
  type MedicalDocumentStackItem,
  useMedicalDocumentsStackHeadStyles,
} from '@/features/documents/components/medical-documents-stack';
import { MedicalDocumentPreviewModal } from '@/features/documents/components/MedicalDocumentPreviewModal';

const PROFILE_DOC_TYPES = PATIENT_PROFILE_UPLOAD_TYPES;

function toStackItem(row: PatientDocumentRow): MedicalDocumentStackItem {
  return {
    id: row.medical_document_id ?? row.id,
    document_type: row.document_type ?? 'other',
    file_name: row.file_name,
    created_at: row.created_at,
    source: 'patient_profile',
  };
}

interface Props {
  embedded?: boolean;
  /** Dossier patient staff (pro / infirmier). Sinon patient connecté. */
  patientUserId?: string;
}

export function ProfileDocumentsPremiumPanel({ embedded, patientUserId }: Props) {
  const c = useAppColors();
  const section = getRdvDetailSectionStyles();
  const headStyles = useMedicalDocumentsStackHeadStyles();
  const user = useAuthStore((s) => s.user);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const { show: toast } = useToast();
  const qc = useQueryClient();
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ uri: string; fileName?: string } | null>(null);

  const targetUserId = patientUserId ?? user?.id ?? '';
  const isStaffDossier = Boolean(patientUserId);

  const docsQ = useQuery({
    queryKey: queryKeys.documents.patient(targetUserId),
    queryFn: async () => {
      const res = await fetchProfileDocuments(
        isStaffDossier ? { userId: targetUserId } : {},
      );
      if (!res.success) throw new Error(res.error ?? 'Erreur chargement documents');
      return filterCoverageProfileDocuments(res.data);
    },
    enabled: isStaffDossier ? Boolean(targetUserId) : isHydrated && Boolean(targetUserId),
    staleTime: 30_000,
  });

  const list = useMemo(() => (docsQ.data ?? []).map(toStackItem), [docsQ.data]);

  const existingTypes = useMemo(
    () => new Set(list.map((d) => d.document_type)),
    [list],
  );

  const uploadTypesFiltered = useMemo(
    () => filterUploadTypesForStack(PROFILE_DOC_TYPES, existingTypes),
    [existingTypes],
  );

  const stackRows = useMemo(
    () => buildDocumentStackRows(list, PROFILE_DOC_TYPES, uploadTypesFiltered),
    [list, uploadTypesFiltered],
  );

  const uploadMut = useMutation({
    mutationFn: async ({
      docType,
      uri,
      name,
      mimeType,
    }: {
      docType: PatientProfileUploadType;
      uri: string;
      name: string;
      mimeType: string;
    }) => {
      if (!targetUserId) throw new Error('Session expirée — reconnectez-vous.');
      const uploaded = await uploadPatientProfileDocument(targetUserId, docType, {
        uri,
        fileName: name,
        mimeType,
      });
      if (!uploaded?.id) throw new Error('Réponse upload invalide');
      return { ...uploaded, document_type: uploaded.document_type ?? docType };
    },
    onSuccess: (uploaded, vars) => {
      qc.setQueryData<PatientDocumentRow[]>(
        queryKeys.documents.patient(targetUserId),
        (prev) =>
          mergePatientDocumentRow(prev, {
            id: uploaded.id,
            file_name: uploaded.file_name ?? vars.name,
            document_type: uploaded.document_type ?? vars.docType,
          }),
      );
      void qc.invalidateQueries({ queryKey: queryKeys.documents.patient(targetUserId) });
      void qc.invalidateQueries({ queryKey: ['documents', 'medical'] });
      const hadDoc = (docsQ.data ?? []).some((d) => d.document_type === vars.docType);
      toast(hadDoc ? 'Document mis à jour' : 'Document envoyé', { type: 'success' });
    },
    onError: (e) => handleApiError(e, toast, 'patient-documents/upload'),
    onSettled: () => setUploadingType(null),
  });

  const runUploadForType = useCallback(
    async (docType: string) => {
      if (!targetUserId || uploadingType) {
        if (!targetUserId) toast('Session expirée — reconnectez-vous.', { type: 'error' });
        return;
      }
      if (!PROFILE_DOC_TYPES.includes(docType as PatientProfileUploadType)) return;

      let picked;
      try {
        picked = await pickMedicalDocumentFile();
      } catch (e) {
        toast(medicalDocumentPickErrorMessage(e), { type: 'error' });
        return;
      }
      if (!picked) return;

      setUploadingType(docType);
      try {
        await uploadMut.mutateAsync({
          docType: docType as PatientProfileUploadType,
          uri: picked.uri,
          name: picked.fileName,
          mimeType: picked.mimeType,
        });
      } catch {
        /* toast via onError */
      }
    },
    [uploadMut, uploadingType, toast, targetUserId],
  );

  const handlePreview = useCallback((localUri: string, fileName?: string) => {
    setPreview({ uri: localUri, fileName });
  }, []);

  const headSubtitle = useMemo(() => {
    if (docsQ.isFetching && !docsQ.data) {
      return 'Chargement…';
    }
    if (list.length > 0) {
      return `${list.length} pièce${list.length > 1 ? 's' : ''} enregistrée${list.length > 1 ? 's' : ''} · l’ordonnance se gère sur chaque rendez-vous`;
    }
    return 'Carte Vitale, mutuelle et autre prescription — appuyez sur une ligne pour ajouter';
  }, [docsQ.data, docsQ.isFetching, list.length]);

  const showEmptyHint = stackRows.length === 0 && !docsQ.isFetching;

  return (
    <>
      <View style={section.card}>
        {!embedded ? (
          <MedicalDocumentsStackHead title="Documents médicaux" subtitle={headSubtitle} />
        ) : null}

        {showEmptyHint ? (
          <View style={headStyles.emptyRow}>
            <Text style={[headStyles.emptyText, { color: c.textSecondary }]}>
              Aucun document enregistré — ajoutez la Carte Vitale, la mutuelle ou une autre prescription
              ci-dessous.
            </Text>
          </View>
        ) : null}

        {stackRows.map((row, index) => {
          const topBorder = index > 0 || Boolean(embedded);
          if (row.kind === 'open') {
            return (
              <MedicalDocumentOpenRowContainer
                key={row.key}
                doc={row.doc}
                topBorder={topBorder}
                cacheScopeKey={`patient:${targetUserId}`}
                canReplace
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
        })}
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
