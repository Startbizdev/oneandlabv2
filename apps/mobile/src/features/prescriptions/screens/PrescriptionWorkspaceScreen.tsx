import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FilePenLine, History, PlusCircle } from 'lucide-react-native';
import { KeyboardScrollView } from '@/components/layout/KeyboardScrollView';
import { FullWidthSegmentBar } from '@/components/ui/FullWidthSegmentBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonList } from '@/components/ui/skeletons';
import { fetchMedicalDocuments } from '@/features/appointments/detail/api/appointment-detail.service';
import { StaffPatientEditSheet } from '@/features/patients/components/StaffPatientEditSheet';
import { cacheMedicalDocument, openMedicalDocument } from '@/lib/downloads/download-medical-document';
import { queryKeys } from '@/lib/query-keys';
import { useToast } from '@/providers/ToastProvider';
import { MedicalDocumentPreviewModal } from '@/features/documents/components/MedicalDocumentPreviewModal';
import type { ProPrescriptionRow, PrescriptionLinkMode } from '../api/prescriptions.service';
import { PrescriptionComposer } from '../components/PrescriptionComposer';
import type { OpenPrescriptionSignatureOptions } from '../components/PrescriptionSignatureSheet';
import { PrescriptionSignatureSheet } from '../components/PrescriptionSignatureSheet';
import { PrescriptionHistoryCard } from '../components/PrescriptionHistoryCard';
import { PrescriptionAppointmentSelectField } from '../components/PrescriptionAppointmentSelectField';
import { PrescriptionComposerAwaitingRdv } from '../components/PrescriptionComposerAwaitingRdv';
import { PrescriptionLinkModeTabs } from '../components/PrescriptionLinkModeTabs';
import { PrescriptionPatientSelectField } from '../components/PrescriptionPatientSelectField';
import {
  flattenPrescriptionPickerAppointments,
  prescriptionPickerTotalCount,
  usePrescriptionAppointmentPickerInfinite,
} from '../hooks/use-prescription-appointment-picker-infinite';
import {
  flattenPrescriptionPickerPatients,
  prescriptionPatientPickerTotalCount,
  usePrescriptionPatientPickerInfinite,
} from '../hooks/use-prescription-patient-picker-infinite';
import { usePrescriptionsHistoryInfinite } from '../hooks/use-prescriptions-history-infinite';
import { fetchUser } from '@/features/profile/api/profile.service';
import { useAuthStore } from '@/store/auth-store';
import { elevation, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

type WorkspaceTab = 'create' | 'history';

interface Props {
  roleBase?: 'pro' | 'nurse';
  rolePrefix?: '/(pro)' | '/(nurse)';
  /** Fiche patient : patient fixé, historique filtré */
  fixedPatientId?: string;
}

export function PrescriptionWorkspaceScreen({
  roleBase = 'pro',
  rolePrefix = '/(pro)',
  fixedPatientId,
}: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'PrescriptionWorkspaceScreen');
  const prescriptionKind = roleBase === 'nurse' ? 'nursing' : 'medical';
  const router = useRouter();
  const qc = useQueryClient();
  const { show: toast } = useToast();

  const [tab, setTab] = useState<WorkspaceTab>('create');
  const [patientId, setPatientId] = useState(fixedPatientId ?? '');
  const [linkMode, setLinkMode] = useState<PrescriptionLinkMode>('standalone');
  const [appointmentId, setAppointmentId] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState('ordonnance.pdf');
  const [editPatientId, setEditPatientId] = useState<string | null>(null);
  const [signatureSheetOpen, setSignatureSheetOpen] = useState(false);
  const [signaturePendingGenerate, setSignaturePendingGenerate] = useState(false);
  const afterSignatureSaveRef = useRef<(() => void) | null>(null);

  const user = useAuthStore((s) => s.user);
  const profileQ = useQuery({
    queryKey: queryKeys.profile.user(user?.id ?? ''),
    queryFn: async () => (await fetchUser(user!.id, 'full')).data,
    enabled: !!user?.id,
  });

  const handleOpenSignatureSheet = useCallback((options?: OpenPrescriptionSignatureOptions) => {
    afterSignatureSaveRef.current = options?.afterSave ?? null;
    setSignaturePendingGenerate(Boolean(options?.pendingGenerate));
    setSignatureSheetOpen(true);
  }, []);

  const effectivePatientId = fixedPatientId ?? patientId;

  const patientsQ = usePrescriptionPatientPickerInfinite(!fixedPatientId);
  const patientOptions = useMemo(
    () => flattenPrescriptionPickerPatients(patientsQ.data?.pages),
    [patientsQ.data?.pages],
  );
  const patientTotal = prescriptionPatientPickerTotalCount(patientsQ.data?.pages);

  const historyQ = usePrescriptionsHistoryInfinite(roleBase, fixedPatientId ?? undefined, tab === 'history');
  const historyRows = useMemo(() => {
    const pages = historyQ.data?.pages;
    if (!pages?.length) return [];
    const seen = new Set<string>();
    const out: ProPrescriptionRow[] = [];
    for (const page of pages) {
      for (const row of page.rows) {
        if (seen.has(row.id)) continue;
        seen.add(row.id);
        out.push(row);
      }
    }
    return out;
  }, [historyQ.data?.pages]);

  const appointmentsQ = usePrescriptionAppointmentPickerInfinite(
    effectivePatientId,
    prescriptionKind,
    Boolean(effectivePatientId) && linkMode === 'appointment' && tab === 'create',
  );
  const appointmentOptions = useMemo(
    () => flattenPrescriptionPickerAppointments(appointmentsQ.data?.pages),
    [appointmentsQ.data?.pages],
  );
  const appointmentTotal = prescriptionPickerTotalCount(appointmentsQ.data?.pages);

  const docsQ = useQuery({
    queryKey: queryKeys.documents.medical(appointmentId),
    queryFn: async () => (await fetchMedicalDocuments(appointmentId)).data ?? [],
    enabled: Boolean(appointmentId),
  });

  const refreshAll = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: ['prescriptions'] });
    if (appointmentId) await docsQ.refetch();
  }, [appointmentId, docsQ, qc]);

  const previewRow = async (id: string, fileName?: string) => {
    setPreviewingId(id);
    const res = await cacheMedicalDocument(id, fileName);
    setPreviewingId(null);
    if (!res.ok || !res.localUri) {
      toast(res.error ?? 'Aperçu impossible', { type: 'error' });
      return;
    }
    setPreviewUri(res.localUri);
    setPreviewFileName(fileName ?? 'ordonnance.pdf');
    setPreviewOpen(true);
  };

  const downloadRow = async (id: string, fileName?: string) => {
    setDownloadingId(id);
    const res = await openMedicalDocument(id, fileName);
    setDownloadingId(null);
    if (!res.ok) toast(res.error ?? 'Ouverture impossible', { type: 'error' });
  };

  const onPatientChange = (id: string) => {
    setPatientId(id);
    setAppointmentId('');
  };

  const onLinkModeChange = (mode: PrescriptionLinkMode) => {
    setLinkMode(mode);
    if (mode === 'standalone') setAppointmentId('');
  };

  const renderHistoryItem: ListRenderItem<ProPrescriptionRow> = ({ item, index }) => (
    <PrescriptionHistoryCard
      row={item}
      showPatient={!fixedPatientId}
      topBorder={index > 0}
      downloading={downloadingId === item.id}
      onDownload={() => void downloadRow(item.id, item.file_name)}
      onPreview={() => void previewRow(item.id, item.file_name)}
      previewing={previewingId === item.id}
      onOpenAppointment={
        item.appointment_id
          ? () => router.push(`${rolePrefix}/appointment/${item.appointment_id}` as never)
          : undefined
      }
    />
  );

  const historyFooter =
    historyQ.isFetchingNextPage ? (
      <View style={styles.listFooter}>
        <ActivityIndicator size="small" color={c.primary} />
      </View>
    ) : null;

  const segments = [
    { id: 'create' as const, label: 'Créer', Icon: PlusCircle },
    { id: 'history' as const, label: 'Historique', Icon: History },
  ];

  return (
    <View style={styles.container}>
      <KeyboardScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={historyQ.isRefetching && tab === 'history'}
            onRefresh={() => void refreshAll()}
          />
        }
      >
        <FullWidthSegmentBar segments={segments} value={tab} onChange={setTab} />

        {tab === 'create' ? (
          <View style={[styles.section, elevation.xs]}>
            {!fixedPatientId ? (
              <PrescriptionPatientSelectField
                patients={patientOptions}
                selectedId={patientId}
                onSelect={onPatientChange}
                onEditPatient={(id) => setEditPatientId(id)}
                loading={patientsQ.isPending}
                totalCount={patientTotal}
                hasNextPage={patientsQ.hasNextPage}
                isFetchingNextPage={patientsQ.isFetchingNextPage}
                onLoadMore={() => void patientsQ.fetchNextPage()}
              />
            ) : null}

            {effectivePatientId ? (
              <PrescriptionLinkModeTabs value={linkMode} onChange={onLinkModeChange} />
            ) : null}

            {effectivePatientId && linkMode === 'standalone' ? (
              <View style={styles.composerWrap}>
                <PrescriptionComposer
                  patientId={effectivePatientId}
                  appointmentId={null}
                  documents={[]}
                  onDocumentsChanged={refreshAll}
                  prescriptionKind={prescriptionKind}
                  embedded
                  onOpenSignatureSheet={handleOpenSignatureSheet}
                />
              </View>
            ) : null}

            {effectivePatientId && linkMode === 'appointment' ? (
              <>
                <PrescriptionAppointmentSelectField
                  appointments={appointmentOptions}
                  selectedId={appointmentId}
                  onSelect={setAppointmentId}
                  loading={appointmentsQ.isPending}
                  totalCount={appointmentTotal}
                  hasNextPage={appointmentsQ.hasNextPage}
                  isFetchingNextPage={appointmentsQ.isFetchingNextPage}
                  onLoadMore={() => void appointmentsQ.fetchNextPage()}
                />
                {appointmentId ? (
                  <View style={styles.composerWrap}>
                  <PrescriptionComposer
                    patientId={effectivePatientId}
                    appointmentId={appointmentId}
                    documents={docsQ.data ?? []}
                    onDocumentsChanged={refreshAll}
                    prescriptionKind={prescriptionKind}
                    embedded
                    onOpenSignatureSheet={handleOpenSignatureSheet}
                  />
                  </View>
                ) : (
                  <PrescriptionComposerAwaitingRdv />
                )}
              </>
            ) : null}
          </View>
        ) : (
          <View style={[styles.section, styles.historySection]}>
            {historyQ.isLoading ? (
              <SkeletonList count={3} itemHeight={52} gap={spacing[1]} />
            ) : historyRows.length === 0 ? (
              <EmptyState
                Icon={FilePenLine}
                title="Aucune ordonnance"
                description="Les ordonnances enregistrées apparaîtront ici."
              />
            ) : (
              <FlashList
                data={historyRows}
                keyExtractor={(row) => row.id}
                renderItem={renderHistoryItem}
                estimatedItemSize={72}
                scrollEnabled={false}
                onEndReached={() => {
                  if (historyQ.hasNextPage && !historyQ.isFetchingNextPage) {
                    void historyQ.fetchNextPage();
                  }
                }}
                onEndReachedThreshold={0.3}
                ListFooterComponent={historyFooter}
              />
            )}
          </View>
        )}
      </KeyboardScrollView>

      <MedicalDocumentPreviewModal
        visible={previewOpen}
        localUri={previewUri}
        fileName={previewFileName}
        onClose={() => {
          setPreviewOpen(false);
          setPreviewUri(null);
        }}
      />

      {editPatientId ? (
        <StaffPatientEditSheet
          visible={Boolean(editPatientId)}
          patientId={editPatientId}
          onClose={() => setEditPatientId(null)}
          onSaved={() => void patientsQ.refetch()}
        />
      ) : null}

      {user?.id ? (
        <PrescriptionSignatureSheet
          visible={signatureSheetOpen}
          onClose={() => {
            setSignatureSheetOpen(false);
            setSignaturePendingGenerate(false);
            afterSignatureSaveRef.current = null;
          }}
          userId={user.id}
          initialPng={profileQ.data?.prescription_signature_png}
          pendingGenerate={signaturePendingGenerate}
          onSaved={() => {
            afterSignatureSaveRef.current?.();
            afterSignatureSaveRef.current = null;
          }}
        />
      ) : null}
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
    container: { minWidth: 0, flex: 1, backgroundColor: c.background },
    scroll: { minWidth: 0, flex: 1 },
    content: {
      padding: spacing[4],
      gap: spacing[4],
      paddingBottom: spacing[10],
    },
    section: {
      backgroundColor: c.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: c.borderLight,
      padding: spacing[4],
      gap: spacing[4],
    },
    historySection: {
      padding: spacing[3],
      gap: spacing[2],
    },
    composerWrap: {
      marginTop: spacing[2],
      paddingTop: spacing[4],
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.borderLight,
    },
    listFooter: {
      paddingVertical: spacing[3],
      alignItems: 'center' as const,
    },
  };
}
