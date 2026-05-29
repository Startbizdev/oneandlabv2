import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CreditCard,
  Download,
  FileText,
  FileUp,
  FlaskConical,
  Plus,
  Shield,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import type { Appointment } from '@oneandlab/shared-types';
import { queryKeys } from '@/lib/query-keys';
import { useToast } from '@/providers/ToastProvider';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { buildMedicalDocumentForm, uploadFormData } from '@/lib/uploads/upload-file';
import { pickMedicalDocumentFile } from '@/lib/uploads/pick-medical-document';
import { downloadMedicalDocument } from '@/lib/downloads/download-medical-document';
import { canUploadMedicalDocumentsForAppointmentStatus } from '@/utils/appointment-documents-upload';
import { useAppointmentDetail } from '@/features/appointments/hooks/use-appointment-detail';
import { resolveAppointmentDetail } from '@/features/appointments/hooks/appointment-detail-result';
import { fetchMedicalDocuments } from '@/features/appointments/detail/api/appointment-detail.service';
import { filterListDocuments, getDocumentTypeLabel } from '@/features/appointments/detail/utils/document-labels';
import {
  formatDocumentFileSubtitle,
  formatDocumentRowTitle,
} from '@/utils/document-display-name';
import { PatientPaginationBar } from '../detail/components/patient/PatientPaginationBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonList } from '@/components/ui/skeletons';
import { colors, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

const PAGE_SIZE = 6;
const UPLOAD_TYPES = [
  'carte_vitale',
  'carte_mutuelle',
  'ordonnance',
  'autres_assurances',
  'other',
] as const;

const DOC_ICONS: Record<string, LucideIcon> = {
  carte_vitale: CreditCard,
  carte_mutuelle: Shield,
  ordonnance: FileText,
  resultats: FlaskConical,
  autres_assurances: FileText,
  other: FileText,
};

function UploadSection({
  canUpload,
  uploading,
  onPick,
}: {
  canUpload: boolean;
  uploading: string | null;
  onPick: (docType: string) => void;
}) {
  if (!canUpload) return null;
  return (
    <View style={styles.uploadCard}>
      <Text style={styles.uploadTitle}>Ajouter un document</Text>
      <Text style={styles.uploadHint}>
        Appuyez sur un type, puis choisissez une photo ou un fichier PDF.
      </Text>
      <View style={styles.uploadGrid}>
        {UPLOAD_TYPES.map((t) => (
          <Pressable
            key={t}
            style={[styles.uploadChip, uploading === t && styles.uploadChipActive]}
            disabled={Boolean(uploading)}
            onPress={() => onPick(t)}
          >
            <Plus size={14} color={colors.primary} strokeWidth={2.5} />
            <Text style={styles.uploadChipText} numberOfLines={2}>
              {uploading === t ? 'Envoi…' : getDocumentTypeLabel(t)}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function PatientAppointmentDocumentsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { show: toast } = useToast();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [uploading, setUploading] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const cachedApt = id
    ? resolveAppointmentDetail(qc.getQueryData(queryKeys.appointments.detail(id)))
    : null;
  const detailQ = useAppointmentDetail(id);
  const apt = resolveAppointmentDetail(detailQ.data) ?? cachedApt ?? null;

  const docsQ = useQuery({
    queryKey: queryKeys.documents.medical(id ?? ''),
    queryFn: async () => {
      const res = await fetchMedicalDocuments(id!);
      return res.data ?? [];
    },
    enabled: Boolean(id),
  });

  const allDocs = useMemo(
    () =>
      filterListDocuments(
        (docsQ.data ?? []).filter((d) => d.document_type !== 'cancellation_photo'),
        { omitCarePhotos: true },
      ),
    [docsQ.data],
  );

  const pages = Math.max(1, Math.ceil(allDocs.length / PAGE_SIZE));
  const pageDocs = allDocs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const canUpload = apt ? canUploadMedicalDocumentsForAppointmentStatus(apt.status) : false;

  const pickAndUpload = useCallback(
    async (docType: string) => {
      if (!canUpload || !id || uploading) return;
      try {
        const picked = await pickMedicalDocumentFile();
        if (!picked) return;
        setUploading(docType);
        const fd = await buildMedicalDocumentForm(
          {
            uri: picked.uri,
            fileName: picked.fileName,
            mimeType: picked.mimeType,
          },
          { appointment_id: id, document_type: docType },
        );
        await uploadFormData('/medical-documents', fd);
        void qc.invalidateQueries({ queryKey: queryKeys.documents.medical(id) });
        void qc.invalidateQueries({ queryKey: queryKeys.appointments.detail(id) });
        toast('Document envoyé', { type: 'success' });
      } catch (e) {
        handleApiError(e, toast, 'upload-doc');
      } finally {
        setUploading(null);
      }
    },
    [canUpload, id, qc, toast, uploading],
  );

  const handleDownload = useCallback(
    async (docId: string, fileName?: string) => {
      setDownloadingId(docId);
      const res = await downloadMedicalDocument(docId, fileName);
      setDownloadingId(null);
      if (res.ok) toast('Document prêt à enregistrer', { type: 'success' });
      else toast(res.error ?? 'Téléchargement impossible', { type: 'error' });
    },
    [toast],
  );

  const ListHeader = () => (
    <View style={styles.intro}>
      <Text style={styles.introTitle}>Documents médicaux</Text>
      <Text style={styles.introSub}>
        {canUpload
          ? 'Consultez, téléchargez ou ajoutez vos pièces pour ce rendez-vous.'
          : 'Consultez et téléchargez les documents de ce rendez-vous.'}
      </Text>
      <UploadSection canUpload={canUpload} uploading={uploading} onPick={(t) => void pickAndUpload(t)} />
    </View>
  );

  const ListFooter = () => (
    <View style={styles.footer}>
      {allDocs.length > 0 ? (
        <PatientPaginationBar
          page={page}
          pages={pages}
          total={allDocs.length}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => Math.min(pages, p + 1))}
        />
      ) : null}
    </View>
  );

  if (docsQ.isLoading && !docsQ.data) {
    return (
      <View style={styles.loading}>
        <SkeletonList count={4} itemHeight={72} gap={10} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={pageDocs}
        keyExtractor={(d) => d.id}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        refreshControl={
          <RefreshControl
            refreshing={docsQ.isRefetching}
            onRefresh={() => {
              void docsQ.refetch();
              if (id) void detailQ.refetch();
            }}
            tintColor={colors.primary}
          />
        }
        renderItem={({ item }) => {
          const Icon = DOC_ICONS[item.document_type] ?? FileText;
          const label = formatDocumentRowTitle(item.document_type);
          const sub = formatDocumentFileSubtitle(
            item.document_type,
            item.file_name,
            item.created_at,
          );
          return (
            <View style={styles.docCard}>
              <View style={styles.docIcon}>
                <Icon size={18} color={colors.primary} strokeWidth={2} />
              </View>
              <View style={styles.docBody}>
                <Text style={styles.docLabel}>{label}</Text>
                <Text style={styles.docFile} numberOfLines={1}>
                  {sub}
                </Text>
              </View>
              <Pressable
                onPress={() => void handleDownload(item.id, item.file_name)}
                disabled={downloadingId === item.id}
                style={styles.downloadBtn}
              >
                {downloadingId === item.id ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Download size={18} color={colors.primary} strokeWidth={2.25} />
                )}
              </Pressable>
            </View>
          );
        }}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <EmptyState
              Icon={FileUp}
              title="Aucun document"
              description={
                canUpload
                  ? 'Ajoutez votre carte Vitale, mutuelle ou ordonnance via les boutons ci-dessus.'
                  : 'Aucun document disponible pour ce rendez-vous.'
              }
            />
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loading: { flex: 1, padding: spacing[4] },
  intro: { gap: spacing[2], marginBottom: spacing[3] },
  introTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    color: colors.textPrimary,
  },
  introSub: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: fontSize.sm * 1.45,
  },
  list: { paddingHorizontal: spacing[4], paddingBottom: spacing[12], flexGrow: 1 },
  sep: { height: spacing[2] },
  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[3.5],
  },
  docIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docBody: { flex: 1, minWidth: 0, gap: 2 },
  docLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  docFile: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  downloadBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: { gap: spacing[3], marginTop: spacing[2] },
  uploadCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[4],
    gap: spacing[2],
    marginTop: spacing[1],
  },
  uploadTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize['2xs'],
    color: colors.textTertiary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  uploadHint: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    lineHeight: fontSize.xs * 1.4,
  },
  uploadGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
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
    flexBasis: '46%',
    flexGrow: 1,
  },
  uploadChipActive: { opacity: 0.6 },
  uploadChipText: {
    flex: 1,
    fontFamily: fontFamily.medium,
    fontSize: fontSize['2xs'],
    color: colors.textPrimary,
  },
  emptyWrap: { paddingVertical: spacing[6] },
});
