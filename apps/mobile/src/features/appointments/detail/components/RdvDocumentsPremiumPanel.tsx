import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { pickMedicalDocumentFile } from '@/lib/uploads/pick-medical-document';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CreditCard,
  FileText,
  FileUp,
  FlaskConical,
  Plus,
  Shield,
} from 'lucide-react-native';
import { DocumentDownloadButton } from '@/features/documents/components/DocumentDownloadButton';
import { useDownloadedDocumentIds } from '@/features/documents/hooks/use-downloaded-document-ids';
import type { LucideIcon } from 'lucide-react-native';
import type { Appointment } from '@oneandlab/shared-types';
import { queryKeys } from '@/lib/query-keys';
import { useToast } from '@/providers/ToastProvider';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { buildMedicalDocumentForm, uploadFormData } from '@/lib/uploads/upload-file';
import { downloadMedicalDocument } from '@/lib/downloads/download-medical-document';
import {
  canUploadLabResultatsForAppointmentStatus,
  canUploadMedicalDocumentsForAppointmentStatus,
} from '@/utils/appointment-documents-upload';
import { Skeleton } from '@/components/ui/Skeleton';
import type { MedicalDocumentRow } from '../api/appointment-detail.service';
import {
  filterListDocuments,
  getDocumentTypeLabel,
} from '../utils/document-labels';
import {
  formatDocumentFileSubtitle,
  formatDocumentRowTitle,
} from '@/utils/document-display-name';
import { colors, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';
import { PatientListCard } from './patient/PatientListPrimitives';

const STAFF_TYPES = [
  'carte_vitale',
  'carte_mutuelle',
  'ordonnance',
  'autres_assurances',
  'other',
] as const;

const PATIENT_TYPES = STAFF_TYPES;

const DOC_ICONS: Record<string, LucideIcon> = {
  carte_vitale: CreditCard,
  carte_mutuelle: Shield,
  ordonnance: FileText,
  resultats: FlaskConical,
  autres_assurances: FileText,
  other: FileText,
};

interface Props {
  appointmentId: string;
  apt: Appointment;
  role: string;
  docs: MedicalDocumentRow[];
  loading?: boolean;
  omitCarePhotos?: boolean;
  /** Sans en-tête carte (onglet Documents) */
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

function DocRow({
  doc,
  downloading,
  downloaded,
  onDownload,
  bordered,
}: {
  doc: MedicalDocumentRow;
  downloading: boolean;
  downloaded: boolean;
  onDownload: (d: MedicalDocumentRow) => void;
  bordered: boolean;
}) {
  const Icon = DOC_ICONS[doc.document_type] ?? FileText;
  const label = formatDocumentRowTitle(doc.document_type);
  const sub = formatDocumentFileSubtitle(
    doc.document_type,
    doc.file_name,
    doc.created_at,
  );
  return (
    <View style={[styles.docRow, bordered && styles.docRowBorder]}>
      <View style={styles.docIcon}>
        <Icon size={16} color={colors.primary} strokeWidth={2} />
      </View>
      <View style={styles.docBody}>
        <Text style={styles.docLabel}>{label}</Text>
        <Text style={styles.docFile} numberOfLines={1}>
          {sub}
        </Text>
      </View>
      <DocumentDownloadButton
        downloaded={downloaded}
        downloading={downloading}
        onPress={() => onDownload(doc)}
        accessibilityLabel={`Télécharger ${label}`}
      />
    </View>
  );
}

export function RdvDocumentsPremiumPanel({
  appointmentId,
  apt,
  role,
  docs,
  loading,
  omitCarePhotos = true,
  embedded = false,
}: Props) {
  const { show: toast } = useToast();
  const qc = useQueryClient();
  const [uploading, setUploading] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const { isDownloaded, markDownloaded } = useDownloadedDocumentIds(`apt:${appointmentId}`);

  const canUpload = canUploadMedicalDocumentsForAppointmentStatus(apt.status);
  const uploadTypes = useMemo(() => uploadTypesForRole(role, apt), [role, apt]);

  const list = filterListDocuments(
    docs.filter((d) =>
      role === 'patient' ? d.document_type !== 'cancellation_photo' : true,
    ),
    { omitCarePhotos },
  );

  const existingTypes = useMemo(
    () => new Set(list.map((d) => d.document_type)),
    [list],
  );

  const uploadTypesFiltered = useMemo(() => {
    if (!canUpload) return [];
    return uploadTypes.filter(
      (t) => t === 'other' || t === 'autres_assurances' || !existingTypes.has(t),
    );
  }, [canUpload, uploadTypes, existingTypes]);

  const emptyHint =
    role === 'patient'
      ? canUpload
        ? 'Ajoutez vos pièces ci-dessous — vous pourrez compléter après la réservation.'
        : 'Les documents ne peuvent plus être ajoutés pour ce rendez-vous.'
      : canUpload
        ? 'Aucun document médical pour ce rendez-vous. Déposez un fichier via les boutons ci-dessous.'
        : 'Aucun document disponible pour ce rendez-vous.';

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

  const handleDownload = useCallback(
    async (doc: MedicalDocumentRow) => {
      setDownloadingId(doc.id);
      const res = await downloadMedicalDocument(doc.id, doc.file_name);
      setDownloadingId(null);
      if (res.ok) {
        await markDownloaded(doc.id);
        toast('Document prêt à enregistrer', { type: 'success' });
      } else toast(res.error ?? 'Téléchargement impossible', { type: 'error' });
    },
    [toast, markDownloaded],
  );

  const cardTitle = embedded ? undefined : 'Documents';

  if (loading) {
    return (
      <PatientListCard title={cardTitle} Icon={embedded ? undefined : FileText}>
        <View style={styles.skeletonPad}>
          <Skeleton height={44} borderRadius={radius.lg} />
          <Skeleton height={44} borderRadius={radius.lg} />
        </View>
      </PatientListCard>
    );
  }

  return (
    <PatientListCard title={cardTitle} Icon={embedded ? undefined : FileText}>
      {list.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <FileUp size={20} color={colors.textTertiary} strokeWidth={1.75} />
          </View>
          <Text style={styles.emptyTitle}>Aucun document</Text>
          <Text style={styles.emptyHint}>{emptyHint}</Text>
        </View>
      ) : (
        list.map((d, i) => (
          <DocRow
            key={d.id}
            doc={d}
            downloading={downloadingId === d.id}
            downloaded={isDownloaded(d.id)}
            onDownload={(doc) => void handleDownload(doc)}
            bordered={i > 0}
          />
        ))
      )}

      {canUpload && uploadTypesFiltered.length > 0 ? (
        <View style={styles.uploadZone}>
          <Text style={styles.uploadTitle}>Ajouter</Text>
          <View style={styles.uploadGrid}>
            {uploadTypesFiltered.map((t) => (
              <Pressable
                key={t}
                style={[styles.uploadChip, uploading === t && styles.uploadChipActive]}
                disabled={uploading === t}
                onPress={() => void pickAndUpload(t)}
              >
                <Plus size={14} color={colors.primary} strokeWidth={2.5} />
                <Text style={styles.uploadChipText} numberOfLines={2}>
                  {uploading === t ? 'Envoi…' : getDocumentTypeLabel(t)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
    </PatientListCard>
  );
}

const styles = StyleSheet.create({
  skeletonPad: { padding: spacing[3], gap: spacing[2] },
  empty: {
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    gap: spacing[1.5],
  },
  emptyIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  emptyHint: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: fontSize.xs * 1.45,
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2.5],
  },
  docRowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
  },
  docIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docBody: { flex: 1, minWidth: 0, gap: 1 },
  docLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  docFile: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize['2xs'],
    color: colors.textSecondary,
  },
  downloadBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadZone: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    gap: spacing[2],
  },
  uploadTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize['2xs'],
    color: colors.textTertiary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  uploadGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  uploadChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[2],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    maxWidth: '48%',
    flexGrow: 1,
    flexBasis: '46%',
  },
  uploadChipActive: { opacity: 0.6 },
  uploadChipText: {
    flex: 1,
    fontFamily: fontFamily.medium,
    fontSize: fontSize['2xs'],
    color: colors.textPrimary,
    lineHeight: fontSize['2xs'] * 1.35,
  },
});
