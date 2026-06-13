import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useState, useMemo } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FilePenLine } from 'lucide-react-native';
import { KeyboardScrollView } from '@/components/layout/KeyboardScrollView';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonList } from '@/components/ui/skeletons';
import { fetchMedicalDocuments } from '@/features/appointments/detail/api/appointment-detail.service';
import { cacheMedicalDocument, openMedicalDocument } from '@/lib/downloads/download-medical-document';
import { useToast } from '@/providers/ToastProvider';
import { PrescriptionComposer } from '../components/PrescriptionComposer';
import { PrescriptionHistoryCard, PrescriptionHistoryList } from '../components/PrescriptionHistoryCard';
import { PrescriptionAppointmentSelectField } from '../components/PrescriptionAppointmentSelectField';
import { PrescriptionComposerAwaitingRdv } from '../components/PrescriptionComposerAwaitingRdv';
import { PrescriptionLinkModeTabs } from '../components/PrescriptionLinkModeTabs';
import {
  fetchNursePrescriptions,
  fetchProPrescriptions,
  type PrescriptionLinkMode,
} from '../api/prescriptions.service';
import { MedicalDocumentPreviewModal } from '@/features/documents/components/MedicalDocumentPreviewModal';
import {
  flattenPrescriptionPickerAppointments,
  prescriptionPickerTotalCount,
  usePrescriptionAppointmentPickerInfinite,
} from '../hooks/use-prescription-appointment-picker-infinite';
import { spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  patientId: string;
  rolePrefix: '/(pro)' | '/(nurse)';
  roleBase: 'pro' | 'nurse';
}

export function PatientPrescriptionsScreen({ patientId, rolePrefix, roleBase }: Props) {
  const styles = useThemedStyles(buildStyles, 'PatientPrescriptionsScreen');
  const qc = useQueryClient();
  const router = useRouter();
  const { show: toast } = useToast();
  const prescriptionKind = roleBase === 'nurse' ? 'nursing' : 'medical';
  const [linkMode, setLinkMode] = useState<PrescriptionLinkMode>('standalone');
  const [appointmentId, setAppointmentId] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState('ordonnance.pdf');
  const [previewOpen, setPreviewOpen] = useState(false);

  const listQ = useQuery({
    queryKey: ['prescriptions', 'patient', roleBase, patientId] as const,
    queryFn: async () => {
      const fetcher = roleBase === 'nurse' ? fetchNursePrescriptions : fetchProPrescriptions;
      const res = await fetcher(1, 50, patientId);
      return res.data ?? [];
    },
    enabled: Boolean(patientId),
  });

  const appointmentsQ = usePrescriptionAppointmentPickerInfinite(
    patientId,
    prescriptionKind,
    Boolean(patientId) && linkMode === 'appointment',
  );

  const patientAppointments = useMemo(
    () => flattenPrescriptionPickerAppointments(appointmentsQ.data?.pages),
    [appointmentsQ.data?.pages],
  );

  const appointmentTotal = prescriptionPickerTotalCount(appointmentsQ.data?.pages);

  const docsQ = useQuery({
    queryKey: ['prescriptions', 'appointment-docs', appointmentId] as const,
    queryFn: async () => (await fetchMedicalDocuments(appointmentId)).data ?? [],
    enabled: Boolean(appointmentId),
  });

  async function previewDoc(docId: string, fileName?: string) {
    setPreviewingId(docId);
    try {
      const r = await cacheMedicalDocument(docId, fileName);
      if (!r.ok || !r.localUri) {
        toast(r.error ?? 'Aperçu impossible', { type: 'error' });
        return;
      }
      setPreviewUri(r.localUri);
      setPreviewFileName(fileName ?? 'ordonnance.pdf');
      setPreviewOpen(true);
    } catch {
      toast('Aperçu impossible', { type: 'error' });
    } finally {
      setPreviewingId(null);
    }
  }

  async function downloadDoc(docId: string, fileName?: string) {
    setDownloadingId(docId);
    try {
      const r = await openMedicalDocument(docId, fileName);
      if (!r.ok) toast(r.error ?? 'Téléchargement impossible', { type: 'error' });
    } finally {
      setDownloadingId(null);
    }
  }

  async function refreshHistory() {
    await qc.invalidateQueries({ queryKey: ['prescriptions'] });
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Ordonnances' }} />
      <KeyboardScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={listQ.isRefetching} onRefresh={() => void listQ.refetch()} />
        }
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Historique</Text>
          {listQ.isLoading ? (
            <SkeletonList count={2} />
          ) : (listQ.data ?? []).length === 0 ? (
            <EmptyState
              Icon={FilePenLine}
              title="Aucune ordonnance"
              description="Les ordonnances enregistrées pour ce patient apparaîtront ici."
            />
          ) : (
            <PrescriptionHistoryList>
              {(listQ.data ?? []).map((row, index) => (
                <PrescriptionHistoryCard
                  key={row.id}
                  row={row}
                  showPatient={false}
                  topBorder={index > 0}
                  downloading={downloadingId === row.id}
                  onDownload={() => downloadDoc(row.id, row.file_name)}
                  onPreview={() => previewDoc(row.id, row.file_name)}
                  previewing={previewingId === row.id}
                  onOpenAppointment={
                    row.appointment_id
                      ? () =>
                          router.push(
                            `${rolePrefix}/appointment/${row.appointment_id}` as never,
                          )
                      : undefined
                  }
                />
              ))}
            </PrescriptionHistoryList>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Créer</Text>
          <PrescriptionLinkModeTabs
            value={linkMode}
            onChange={(mode) => {
              setLinkMode(mode);
              if (mode === 'standalone') setAppointmentId('');
            }}
          />
          {linkMode === 'standalone' ? (
            <PrescriptionComposer
              patientId={patientId}
              appointmentId={null}
              documents={[]}
              prescriptionKind={prescriptionKind}
              onDocumentsChanged={refreshHistory}
              embedded
            />
          ) : null}
          {linkMode === 'appointment' ? (
            <>
              <PrescriptionAppointmentSelectField
                appointments={patientAppointments}
                selectedId={appointmentId}
                onSelect={setAppointmentId}
                loading={appointmentsQ.isPending}
                totalCount={appointmentTotal}
                hasNextPage={appointmentsQ.hasNextPage}
                isFetchingNextPage={appointmentsQ.isFetchingNextPage}
                onLoadMore={() => void appointmentsQ.fetchNextPage()}
              />
              {appointmentId ? (
                <PrescriptionComposer
                  patientId={patientId}
                  appointmentId={appointmentId}
                  documents={docsQ.data ?? []}
                  prescriptionKind={prescriptionKind}
                  onDocumentsChanged={async () => {
                    await docsQ.refetch();
                    await refreshHistory();
                  }}
                  embedded
                />
              ) : (
                <PrescriptionComposerAwaitingRdv />
              )}
            </>
          ) : null}
        </View>
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
    </>
  );
}

function buildStyles(c: AppColors) {
  return {
    screen: { minWidth: 0, flex: 1, backgroundColor: c.background },
    content: { padding: spacing[4], gap: spacing[5], paddingBottom: spacing[8] },
    section: { gap: spacing[4] },
    sectionTitle: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.lg,
      color: c.textPrimary,
    },
  };
}
