import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';

import { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { Cluster } from '@/components/layout/primitives';
import { useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CreditCard, FileText, Shield } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { StackChromeScreen } from '@/navigation/StackChromeScreen';
import {
  buildTabSceneScrollConfig,
  spreadTabSceneScrollProps,
  useTabSceneInsets,
} from '@/components/navigation/liquid-glass-header-inset';
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
import { ProfileNavRow } from '@/features/profile/components/ProfileNavRow';
import { SkeletonList } from '@/components/ui/skeletons';
import { radius, spacing, iconSize, AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

const PAGE_SIZE = 8;

const DOC_ICONS: Record<string, LucideIcon> = {
  carte_vitale: CreditCard,
  carte_mutuelle: Shield,
  ordonnance: FileText,
  autres_assurances: FileText,
  other: FileText,
};

const UPLOAD_SLOTS: { key: RelativeProfileUploadType; Icon: LucideIcon }[] = [
  { key: 'carte_vitale', Icon: CreditCard },
  { key: 'carte_mutuelle', Icon: Shield },
];

function AddDocumentSection({
  uploading,
  existingTypes,
  onPick,
}: {
  uploading: string | null;
  existingTypes: Set<string>;
  onPick: (docType: RelativeProfileUploadType) => void;
}) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'PatientRelativeDocumentsScreen.AddDocumentSection');
  return (
    <View style={styles.addCard}>
      <AppText style={styles.addKicker}>Ajouter</AppText>
      <AppText style={styles.addHint}>
        Appuyez sur un type, puis choisissez une photo ou un fichier PDF.
      </AppText>
      {UPLOAD_SLOTS.map((slot, index) => {
        const busy = uploading === slot.key;
        const hasType = existingTypes.has(slot.key);
        const subtitle = busy
          ? 'Envoi en cours…'
          : hasType
            ? 'Remplacer le fichier existant'
            : 'Photo ou PDF';

        return (
          <View key={slot.key}>
            {index > 0 ? <View style={styles.rowDivider} /> : null}
            <ProfileNavRow
              icon={slot.Icon}
              title={getDocumentTypeLabel(slot.key)}
              subtitle={subtitle}
              iconBg={hasType ? c.successLight : c.primaryLight}
              disabled={Boolean(uploading)}
              onPress={() => onPick(slot.key)}
            />
          </View>
        );
      })}
    </View>
  );
}

function SavedDocumentRow({
  icon: Icon,
  label,
  sub,
  downloading,
  downloaded,
  onDownload,
}: {
  icon: LucideIcon;
  label: string;
  sub: string;
  downloading: boolean;
  downloaded: boolean;
  onDownload: () => void;
}) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'PatientRelativeDocumentsScreen.SavedDocumentRow');
  return (
    <Cluster
      gap={spacing[3]}
      style={styles.docCard}
      leading={
        <View style={styles.docIcon}>
          <Icon size={iconSize.mdSm} color={c.primary} strokeWidth={2} />
        </View>
      }
      actions={
        <DocumentDownloadButton
          downloaded={downloaded}
          downloading={downloading}
          onPress={onDownload}
          accessibilityLabel={`Télécharger ${label}`}
        />
      }
    >
      <View style={styles.docText}>
        <AppText style={styles.docLabel}>{label}</AppText>
        <AppText style={styles.docFile} numberOfLines={1}>
          {sub}
        </AppText>
      </View>
    </Cluster>
  );
}

export function PatientRelativeDocumentsScreen() {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'features_patient_relatives_screens_PatientRelativeDocumentsScreen_tsx_styles');
  const { id } = useLocalSearchParams<{ id: string }>();
  const { show: toast } = useToast();
  const qc = useQueryClient();
  const sceneInsets = useTabSceneInsets();
  const scrollConfig = buildTabSceneScrollConfig(sceneInsets, styles.list);
  const [page, setPage] = useState(1);
  const [uploading, setUploading] = useState<string | null>(null);
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
      return res.data ?? [];
    },
    enabled: Boolean(id),
  });

  const allDocs = docsQ.data ?? [];
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
        toast(
          existingTypes.has(docType) ? 'Document mis à jour' : 'Document enregistré',
          { type: 'success' },
        );
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

  if ((docsQ.isLoading && !docsQ.data) || (relativeQ.isLoading && !relativeQ.data)) {
    return (
      <StackChromeScreen>
        <View style={styles.loading}>
          <SkeletonList count={4} itemHeight={72} gap={10} />
        </View>
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
        contentContainerStyle={scrollConfig.contentContainerStyle}
        {...spreadTabSceneScrollProps(scrollConfig)}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <AppText style={styles.introTitle}>Documents</AppText>
            <AppText style={styles.introSub}>
              {relativeName
                ? `Carte Vitale et mutuelle pour ${relativeName}.`
                : 'Carte Vitale et mutuelle pour ce proche.'}
            </AppText>
            <AddDocumentSection
              uploading={uploading}
              existingTypes={existingTypes}
              onPick={(t) => void pickAndUpload(t)}
            />
            {allDocs.length > 0 ? (
              <AppText style={styles.sectionKicker}>Enregistrés · {allDocs.length}</AppText>
            ) : (
              <AppText style={styles.emptyHint}>
                Aucun document pour l’instant — appuyez sur une ligne ci-dessus pour en ajouter.
              </AppText>
            )}
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={docsQ.isRefetching}
            onRefresh={() => void docsQ.refetch()}
            tintColor={c.primary}
            progressViewOffset={scrollConfig.refreshProgressOffset}
          />
        }
        renderItem={({ item }) => {
          const Icon = DOC_ICONS[item.document_type ?? ''] ?? FileText;
          const label = formatDocumentRowTitle(item.document_type ?? 'other');
          const sub = formatDocumentFileSubtitle(
            item.document_type ?? 'other',
            item.file_name,
            item.created_at,
          );
          const medicalId = item.medical_document_id ?? item.id;
          return (
            <SavedDocumentRow
              icon={Icon}
              label={label}
              sub={sub}
              downloading={downloadingId === medicalId}
              downloaded={isDownloaded(medicalId)}
              onDownload={() => void handleDownload(medicalId, item.file_name)}
            />
          );
        }}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        ListFooterComponent={
          allDocs.length > 0 ? (
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

function buildStyles(c: AppColors) {
  return {
  container: { minWidth: 0, flex: 1, backgroundColor: c.background },
  loading: { minWidth: 0, flex: 1, padding: spacing[4] },
  list: { minWidth: 0, paddingHorizontal: spacing[4], paddingBottom: spacing[12], flexGrow: 1 },
  header: { gap: spacing[2], marginBottom: spacing[3] },
  introTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    color: c.textPrimary,
  },
  introSub: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: c.textSecondary,
    lineHeight: fontSize.sm * 1.45,
  },
  addCard: {
    backgroundColor: c.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: c.borderLight,
    overflow: 'hidden' as const,
    marginTop: spacing[1],
  },
  addKicker: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: c.textTertiary,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
  },
  addHint: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: c.textSecondary,
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[2],
    lineHeight: fontSize.xs * 1.4,
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: c.borderLight,
    marginLeft: spacing[4] + 40 + spacing[3],
  },
  sectionKicker: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: c.textTertiary,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
    marginTop: spacing[2],
  },
  emptyHint: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: c.textSecondary,
    marginTop: spacing[2],
    lineHeight: fontSize.sm * 1.4,
  },
  sep: { height: spacing[2] },
  docCard: {
    backgroundColor: c.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: c.borderLight,
    padding: spacing[3.5],
  },
  docIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: c.primaryLight,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  docText: { gap: 2 },
  docLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: c.textPrimary,
  },
  docFile: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: c.textSecondary,
  },
  footer: { marginTop: spacing[2] },
};
}

