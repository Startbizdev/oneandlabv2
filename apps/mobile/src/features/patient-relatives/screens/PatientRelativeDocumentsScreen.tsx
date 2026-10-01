import { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CreditCard, FileText, Shield } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { StackChromeScreen } from '@/navigation/StackChromeScreen';
import { DocumentDownloadButton } from '@/features/documents/components/DocumentDownloadButton';
import { useDownloadedDocumentIds } from '@/features/documents/hooks/use-downloaded-document-ids';
import { fetchPatientRelative } from '../api/patient-relatives.service';
import {
  RELATIVE_PROFILE_UPLOAD_TYPES,
  fetchProfileDocuments,
  uploadRelativeProfileDocument,
  type RelativeProfileUploadType,
} from '@/features/patients/api/patient-profile.service';
import { queryKeys } from '@/lib/query-keys';
import { useToast } from '@/providers/ToastProvider';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { pickMedicalDocumentFile } from '@/lib/uploads/pick-medical-document';
import { downloadMedicalDocument } from '@/lib/downloads/download-medical-document';
import { getDocumentTypeLabel } from '@/features/appointments/detail/utils/document-labels';
import {
  formatDocumentFileSubtitle,
  formatDocumentRowTitle,
} from '@/utils/document-display-name';
import { PatientPaginationBar } from '@/features/appointments/detail/components/patient/PatientPaginationBar';
import { SettingsSection } from '@/components/ui/SettingsSection';
import type { SettingsRowProps } from '@/components/ui/SettingsRow';
import { ListRowShell } from '@/components/ui/ListRowShell';
import { SkeletonList } from '@/components/ui/skeletons';
import { ErrorState } from '@/components/ui/ErrorState';
import {
  AppText,
  ICON_STROKE_WIDTH,
  iconSize,
  radius,
  spacing,
  useAppColors,
  useStyles,
  type Theme,
} from '@/theme';

const PAGE_SIZE = 8;

const DOC_ICONS: Record<string, LucideIcon> = {
  carte_vitale: CreditCard,
  carte_mutuelle: Shield,
};

const UPLOAD_SLOTS: { key: RelativeProfileUploadType; Icon: LucideIcon }[] = [
  { key: 'carte_vitale', Icon: CreditCard },
  { key: 'carte_mutuelle', Icon: Shield },
];

function uploadSlotDescription(busy: boolean, hasType: boolean): string {
  if (busy) return 'Envoi en cours…';
  return hasType ? 'Remplacer le fichier' : 'Photo ou PDF';
}

export function PatientRelativeDocumentsScreen() {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { show: toast } = useToast();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [uploading, setUploading] = useState<RelativeProfileUploadType | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const { isDownloaded, markDownloaded } = useDownloadedDocumentIds(`relative:${id ?? ''}`);

  const relativeQ = useQuery({
    queryKey: ['patient-relatives', id],
    queryFn: async () => {
      const res = await fetchPatientRelative(id!);
      if (!res.success || !res.data) throw new Error(res.error ?? 'Proche introuvable');
      return res.data;
    },
    enabled: Boolean(id),
  });

  const docsQ = useQuery({
    queryKey: queryKeys.documents.relative(id ?? ''),
    queryFn: async () => {
      const res = await fetchProfileDocuments({ relativeId: id! });
      if (!res.success) throw new Error(res.error ?? 'Documents indisponibles');
      return res.data ?? [];
    },
    enabled: Boolean(id),
  });

  const allDocs = useMemo(() => docsQ.data ?? [], [docsQ.data]);
  const pages = Math.max(1, Math.ceil(allDocs.length / PAGE_SIZE));
  const pageDocs = allDocs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const existingTypes = useMemo(
    () =>
      new Set(
        allDocs
          .map((d) => d.document_type)
          .filter((t): t is string => typeof t === 'string' && t.length > 0),
      ),
    [allDocs],
  );

  const pickAndUpload = useCallback(
    async (docType: RelativeProfileUploadType) => {
      if (!id || uploading) return;
      if (!RELATIVE_PROFILE_UPLOAD_TYPES.includes(docType)) return;
      try {
        const picked = await pickMedicalDocumentFile();
        if (!picked) return;
        setUploading(docType);
        await uploadRelativeProfileDocument(id, docType, picked);
        void qc.invalidateQueries({ queryKey: queryKeys.documents.relative(id) });
        toast(existingTypes.has(docType) ? 'Document mis à jour' : 'Document enregistré', {
          type: 'success',
        });
      } catch (e) {
        handleApiError(e, toast, 'relative-documents/upload');
      } finally {
        setUploading(null);
      }
    },
    [existingTypes, id, qc, toast, uploading],
  );

  const handleDownload = useCallback(
    async (medicalDocId: string, fileName?: string) => {
      setDownloadingId(medicalDocId);
      const res = await downloadMedicalDocument(medicalDocId, fileName);
      setDownloadingId(null);
      if (res.ok) {
        await markDownloaded(medicalDocId);
        toast('Document ouvert', { type: 'success' });
      } else toast(res.error ?? 'Ouverture impossible', { type: 'error' });
    },
    [toast, markDownloaded],
  );

  const uploadItems: SettingsRowProps[] = UPLOAD_SLOTS.map((slot) => ({
    icon: slot.Icon,
    label: getDocumentTypeLabel(slot.key),
    description: uploadSlotDescription(uploading === slot.key, existingTypes.has(slot.key)),
    onPress: () => void pickAndUpload(slot.key),
    disabled: Boolean(uploading),
  }));

  if ((docsQ.isLoading && !docsQ.data) || (relativeQ.isLoading && !relativeQ.data)) {
    return (
      <StackChromeScreen>
        <View style={styles.loading}>
          <SkeletonList count={4} itemHeight={72} gap={10} />
        </View>
      </StackChromeScreen>
    );
  }

  if (relativeQ.isError && !relativeQ.data) {
    return (
      <StackChromeScreen>
        <ErrorState
          error={relativeQ.error}
          title="Impossible de charger ce proche"
          onRetry={() => void relativeQ.refetch()}
        />
      </StackChromeScreen>
    );
  }

  const relativeName = relativeQ.data
    ? `${relativeQ.data.first_name ?? ''} ${relativeQ.data.last_name ?? ''}`.trim()
    : '';

  return (
    <StackChromeScreen>
      <FlatList
        style={styles.container}
        data={pageDocs}
        keyExtractor={(d) => d.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.header}>
            {relativeName ? (
              <AppText variant="secondary">Carte Vitale et mutuelle de {relativeName}.</AppText>
            ) : null}
            <SettingsSection title="Ajouter" items={uploadItems} />
            {docsQ.isError && !docsQ.data ? (
              <ErrorState
                error={docsQ.error}
                title="Documents indisponibles"
                onRetry={() => void docsQ.refetch()}
              />
            ) : allDocs.length > 0 ? (
              <AppText variant="caption" style={styles.sectionTitle} accessibilityRole="header">
                Enregistrés ({allDocs.length})
              </AppText>
            ) : null}
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={docsQ.isRefetching}
            onRefresh={() => void docsQ.refetch()}
            tintColor={c.primary}
          />
        }
        renderItem={({ item }) => {
          const Icon = DOC_ICONS[item.document_type ?? ''] ?? FileText;
          const label = formatDocumentRowTitle(item.document_type ?? 'other');
          const medicalId = item.medical_document_id ?? item.id;
          return (
            <ListRowShell
              style={styles.docCard}
              leading={
                <View style={styles.docIcon}>
                  <Icon size={iconSize.md} color={c.textSecondary} strokeWidth={ICON_STROKE_WIDTH} />
                </View>
              }
              title={label}
              hint={formatDocumentFileSubtitle(
                item.created_at,
              )}
              actions={
                <DocumentDownloadButton
                  downloaded={isDownloaded(medicalId)}
                  downloading={downloadingId === medicalId}
                  onPress={() => void handleDownload(medicalId, item.file_name)}
                  accessibilityLabel={`Ouvrir ${label}`}
                />
              }
            />
          );
        }}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        ListFooterComponent={
          allDocs.length > PAGE_SIZE ? (
            <View style={styles.footer}>
              <PatientPaginationBar
                page={page}
                pages={pages}
                total={allDocs.length}
                onPrev={() => setPage((p) => Math.max(1, p - 1))}
                onNext={() => setPage((p) => Math.min(pages, p + 1))}
              />
            </View>
          ) : null
        }
      />
    </StackChromeScreen>
  );
}

function buildStyles({ colors: c }: Theme) {
  return {
    container: { minWidth: 0, flex: 1, backgroundColor: c.background },
    loading: { minWidth: 0, flex: 1, padding: spacing[4] },
    list: {
      minWidth: 0,
      paddingHorizontal: spacing[4],
      paddingTop: spacing[2],
      paddingBottom: spacing[12],
      flexGrow: 1,
    },
    header: { gap: spacing[4], marginBottom: spacing[2] },
    sectionTitle: { color: c.textSecondary, paddingHorizontal: spacing[1] },
    sep: { height: spacing[2] },
    docCard: {
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.cardBorder,
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[3],
    },
    docIcon: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      backgroundColor: c.surfaceAlt,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    footer: { marginTop: spacing[3] },
  };
}
