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
import { Stack, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CreditCard, FileText, Shield } from 'lucide-react-native';
import { DocumentDownloadButton } from '@/features/documents/components/DocumentDownloadButton';
import { useDownloadedDocumentIds } from '@/features/documents/hooks/use-downloaded-document-ids';
import type { LucideIcon } from 'lucide-react-native';
import { queryKeys } from '@/lib/query-keys';
import { useToast } from '@/providers/ToastProvider';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { pickMedicalDocumentFile } from '@/lib/uploads/pick-medical-document';
import { downloadMedicalDocument } from '@/lib/downloads/download-medical-document';
import { SkeletonList } from '@/components/ui/skeletons';
import { ProfileNavRow } from '@/features/profile/components/ProfileNavRow';
import { patientFolderHeaderTitle } from '@/navigation/PatientFolderHeaderTitle';
import { ProfileStackBackButton } from '@/navigation/ProfileStackBackButton';
import { getDocumentTypeLabel } from '@/features/appointments/detail/utils/document-labels';
import {
  formatDocumentFileSubtitle,
  formatDocumentRowTitle,
} from '@/utils/document-display-name';
import { PatientPaginationBar } from '@/features/appointments/detail/components/patient/PatientPaginationBar';
import {
  type PatientProfileUploadType,
  fetchPatientDocuments,
  fetchPatientProfile,
  uploadPatientProfileDocument,
} from '../api/patient-profile.service';
import { colors, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

const PAGE_SIZE = 8;

const DOC_ICONS: Record<string, LucideIcon> = {
  carte_vitale: CreditCard,
  carte_mutuelle: Shield,
  ordonnance: FileText,
  autres_assurances: FileText,
  other: FileText,
};

const UPLOAD_SLOTS: { key: PatientProfileUploadType; Icon: LucideIcon }[] = [
  { key: 'carte_vitale', Icon: CreditCard },
  { key: 'carte_mutuelle', Icon: Shield },
  { key: 'autres_assurances', Icon: FileText },
];

function AddDocumentSection({
  uploading,
  existingTypes,
  onPick,
}: {
  uploading: string | null;
  existingTypes: Set<string>;
  onPick: (docType: PatientProfileUploadType) => void;
}) {
  return (
    <View style={styles.addCard}>
      <Text style={styles.addKicker}>Ajouter</Text>
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
              iconBg={hasType ? colors.successLight : colors.primaryLight}
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
  return (
    <View style={styles.docCard}>
      <View style={styles.docIcon}>
        <Icon size={18} color={colors.primary} strokeWidth={2} />
      </View>
      <View style={styles.docText}>
        <Text style={styles.docLabel}>{label}</Text>
        <Text style={styles.docFile} numberOfLines={1}>
          {sub}
        </Text>
      </View>
      <DocumentDownloadButton
        downloaded={downloaded}
        downloading={downloading}
        onPress={onDownload}
        accessibilityLabel={`Télécharger ${label}`}
      />
    </View>
  );
}

export function StaffPatientDocumentsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { show: toast } = useToast();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [uploading, setUploading] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const { isDownloaded, markDownloaded } = useDownloadedDocumentIds(`patient:${id ?? ''}`);

  const profileQ = useQuery({
    queryKey: queryKeys.profile.user(id ?? ''),
    queryFn: async () => {
      const res = await fetchPatientProfile(id!);
      if (!res.success || !res.data) throw new Error(res.error ?? 'Patient introuvable');
      return res.data;
    },
    enabled: Boolean(id),
  });

  const docsQ = useQuery({
    queryKey: queryKeys.documents.patient(id ?? ''),
    queryFn: async () => {
      const res = await fetchPatientDocuments(id!);
      return res.data ?? [];
    },
    enabled: Boolean(id),
  });

  const allDocs = docsQ.data ?? [];
  const pages = Math.max(1, Math.ceil(allDocs.length / PAGE_SIZE));
  const pageDocs = allDocs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const patientFullName = useMemo(() => {
    if (!profileQ.data) return undefined;
    const n = `${profileQ.data.first_name ?? ''} ${profileQ.data.last_name ?? ''}`.trim();
    return n || undefined;
  }, [profileQ.data]);

  const screenOptions = useMemo(
    () => ({
      headerTitle: patientFolderHeaderTitle(patientFullName),
      headerTitleAlign: 'left' as const,
      headerLeft: () => <ProfileStackBackButton />,
    }),
    [patientFullName],
  );

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
    async (docType: PatientProfileUploadType) => {
      if (!id || uploading) return;
      try {
        const picked = await pickMedicalDocumentFile();
        if (!picked) return;
        setUploading(docType);
        await uploadPatientProfileDocument(id, docType, picked);
        void qc.invalidateQueries({ queryKey: queryKeys.documents.patient(id) });
        toast(
          existingTypes.has(docType) ? 'Document mis à jour' : 'Document enregistré',
          { type: 'success' },
        );
      } catch (e) {
        handleApiError(e, toast, 'patient-documents/upload');
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
        toast('Document prêt à enregistrer', { type: 'success' });
      } else toast(res.error ?? 'Téléchargement impossible', { type: 'error' });
    },
    [toast, markDownloaded],
  );

  if (docsQ.isLoading && !docsQ.data) {
    return (
      <>
        <Stack.Screen options={screenOptions} />
        <View style={styles.loading}>
          <SkeletonList count={4} itemHeight={72} gap={10} />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={screenOptions} />
      <View style={styles.container}>
        <FlatList
          data={pageDocs}
          keyExtractor={(d) => d.id}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.header}>
              <AddDocumentSection
                uploading={uploading}
                existingTypes={existingTypes}
                onPick={(t) => void pickAndUpload(t)}
              />
              {allDocs.length > 0 ? (
                <Text style={styles.sectionKicker}>
                  Enregistrés · {allDocs.length}
                </Text>
              ) : (
                <Text style={styles.emptyHint}>
                  Aucun document pour l’instant — appuyez sur une ligne ci-dessus pour en ajouter.
                </Text>
              )}
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={docsQ.isRefetching}
              onRefresh={() => void docsQ.refetch()}
              tintColor={colors.primary}
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
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loading: { flex: 1, padding: spacing[4] },
  list: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: spacing[10],
    flexGrow: 1,
    width: '100%',
  },
  header: {
    gap: spacing[4],
    marginBottom: spacing[2],
    width: '100%',
    alignSelf: 'stretch',
  },
  addCard: {
    width: '100%',
    alignSelf: 'stretch',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
  },
  addKicker: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize['2xs'],
    color: colors.textTertiary,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3.5],
    paddingBottom: spacing[2],
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderLight,
    marginLeft: spacing[4] + 40 + spacing[3],
  },
  sectionKicker: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize['2xs'],
    color: colors.textTertiary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  emptyHint: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: fontSize.sm * 1.45,
    paddingBottom: spacing[2],
  },
  sep: { height: spacing[2] },
  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    width: '100%',
    gap: spacing[3],
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
  },
  docIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  docText: { flex: 1, minWidth: 0, gap: 2 },
  docLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
    color: colors.textPrimary,
  },
  docFile: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: fontSize.sm * 1.35,
  },
  downloadBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  footer: { marginTop: spacing[4], width: '100%' },
});
