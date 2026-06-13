import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { useMemo, useState } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Row } from '@/components/layout/primitives';
import { KeyboardScrollView } from '@/components/layout/KeyboardScrollView';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FilePenLine, PlusCircle } from 'lucide-react-native';
import { fetchAllPatients } from '@/features/patients/api/fetch-all-patients';
import { patientPickerOptionFromRow } from '@/features/patients/utils/patient-contact-display';
import { fetchMedicalDocuments } from '@/features/appointments/detail/api/appointment-detail.service';
import { SelectField } from '@/components/ui/SelectField';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonList } from '@/components/ui/skeletons';
import { Button } from '@/components/ui/Button';
import { queryKeys } from '@/lib/query-keys';
import { cacheMedicalDocument, openMedicalDocument } from '@/lib/downloads/download-medical-document';
import { useToast } from '@/providers/ToastProvider';
import { MedicalDocumentPreviewModal } from '@/features/documents/components/MedicalDocumentPreviewModal';
import { PrescriptionComposer } from '../components/PrescriptionComposer';
import { PrescriptionHistoryCard, PrescriptionHistoryList } from '../components/PrescriptionHistoryCard';
import { PrescriptionAppointmentSelectField } from '../components/PrescriptionAppointmentSelectField';
import { PrescriptionComposerAwaitingRdv } from '../components/PrescriptionComposerAwaitingRdv';
import { PrescriptionLinkModeTabs } from '../components/PrescriptionLinkModeTabs';
import { fetchNursePrescriptions, fetchProPrescriptions, type PrescriptionLinkMode } from '../api/prescriptions.service';
import {
  flattenPrescriptionPickerAppointments,
  prescriptionPickerTotalCount,
  usePrescriptionAppointmentPickerInfinite,
} from '../hooks/use-prescription-appointment-picker-infinite';
import { elevation, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

const PAGE_SIZE = 20;

interface Props {
  roleBase?: 'pro' | 'nurse';
  rolePrefix?: '/(pro)' | '/(nurse)';
}

export function PrescriptionsScreen({
  roleBase = 'pro',
  rolePrefix = '/(pro)',
}: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'PrescriptionsScreen');
  const prescriptionKind = roleBase === 'nurse' ? 'nursing' : 'medical';
  const router = useRouter();
  const qc = useQueryClient();
  const { show: toast } = useToast();
  const [page, setPage] = useState(1);
  const [patientId, setPatientId] = useState('');
  const [linkMode, setLinkMode] = useState<PrescriptionLinkMode>('standalone');
  const [appointmentId, setAppointmentId] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState('ordonnance.pdf');

  const listQ = useQuery({
    queryKey: queryKeys.prescriptions.list(`${roleBase}-p${page}-${patientId}`),
    queryFn: async () => {
      const fetcher = roleBase === 'nurse' ? fetchNursePrescriptions : fetchProPrescriptions;
      const res = await fetcher(page, PAGE_SIZE, patientId || undefined);
      return {
        rows: res.data ?? [],
        pagination: res.pagination as
          | { page?: number; total?: number; pages?: number }
          | undefined,
      };
    },
  });

  const patientsQ = useQuery({
    queryKey: ['prescriptions', 'patients'] as const,
    queryFn: () => fetchAllPatients(),
  });

  const appointmentsQ = usePrescriptionAppointmentPickerInfinite(
    patientId,
    prescriptionKind,
    Boolean(patientId) && linkMode === 'appointment',
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

  const patientOptions = useMemo(
    () =>
      (patientsQ.data ?? []).map((p) => {
        const opt = patientPickerOptionFromRow(p);
        return { value: opt.id, label: opt.label };
      }),
    [patientsQ.data],
  );

  const pagination = listQ.data?.pagination;
  const totalPages = Math.max(1, pagination?.pages ?? 1);

  async function refreshList() {
    setPage(1);
    await qc.invalidateQueries({ queryKey: ['prescriptions'] });
    if (appointmentId) await docsQ.refetch();
  }

  async function previewRow(id: string, fileName?: string) {
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
  }

  async function downloadRow(id: string, fileName?: string) {
    setDownloadingId(id);
    const res = await openMedicalDocument(id, fileName);
    setDownloadingId(null);
    if (!res.ok) toast(res.error ?? 'Ouverture impossible', { type: 'error' });
  }

  function onPatientChange(id: string) {
    setPatientId(id);
    setAppointmentId('');
    setPage(1);
  }

  function onLinkModeChange(mode: PrescriptionLinkMode) {
    setLinkMode(mode);
    if (mode === 'standalone') setAppointmentId('');
  }

  return (
    <View style={styles.container}>
      <KeyboardScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={listQ.isRefetching} onRefresh={() => void refreshList()} />
        }
      >
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>
            {prescriptionKind === 'nursing' ? 'Prescriptions d\'actes' : 'Ordonnances'}
          </Text>
          <Text style={styles.heroDesc}>
            Documents générés pour vos patients, avec ou sans lien vers un rendez-vous.
          </Text>
        </View>

        <View style={[styles.section, styles.historySection]}>
          <Text style={styles.sectionTitle}>Historique</Text>

          {listQ.isLoading ? (
            <SkeletonList count={3} itemHeight={52} gap={spacing[1]} />
          ) : (listQ.data?.rows ?? []).length === 0 ? (
            <EmptyState
              Icon={FilePenLine}
              title="Aucune ordonnance"
              description="Les ordonnances enregistrées apparaîtront ici."
            />
          ) : (
            <PrescriptionHistoryList>
              {(listQ.data?.rows ?? []).map((row, index) => (
                <PrescriptionHistoryCard
                  key={row.id}
                  row={row}
                  showPatient
                  topBorder={index > 0}
                  downloading={downloadingId === row.id}
                  onDownload={() => void downloadRow(row.id, row.file_name)}
                  onPreview={() => void previewRow(row.id, row.file_name)}
                  previewing={previewingId === row.id}
                  onOpenAppointment={
                    row.appointment_id
                      ? () =>
                          router.push(`${rolePrefix}/appointment/${row.appointment_id}` as never)
                      : undefined
                  }
                />
              ))}
            </PrescriptionHistoryList>
          )}

          {totalPages > 1 ? (
            <View style={styles.pager}>
              <Text style={styles.pagerText}>
                Page {page} / {totalPages}
                {pagination?.total != null ? ` · ${pagination.total} ordonnance(s)` : ''}
              </Text>
              <Row justify="center" gap={spacing[2]} style={styles.pagerBtns}>
                <Button
                  title="Préc."
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onPress={() => setPage((p) => Math.max(1, p - 1))}
                />
                <Button
                  title="Suiv."
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onPress={() => setPage((p) => p + 1)}
                />
              </Row>
            </View>
          ) : null}
        </View>

        <View style={[styles.section, elevation.xs]}>
          <Row gap={spacing[2]} style={styles.sectionHeader}>
            <PlusCircle size={20} color={c.primary} strokeWidth={2} />
            <Text style={styles.sectionTitle}>Nouvelle ordonnance</Text>
          </Row>
          <Text style={styles.sectionHint}>
            Choisissez un patient, puis rédigez l'ordonnance — avec ou sans lien vers un rendez-vous.
          </Text>

          <SelectField
            label="Patient"
            value={patientId}
            options={patientOptions}
            onChange={onPatientChange}
            placeholder="Sélectionner un patient…"
            sheetTitle="Patient"
          />

          {patientId ? (
            <PrescriptionLinkModeTabs value={linkMode} onChange={onLinkModeChange} />
          ) : null}

          {patientId && linkMode === 'standalone' ? (
            <View style={styles.composerWrap}>
              <PrescriptionComposer
                patientId={patientId}
                appointmentId={null}
                documents={[]}
                onDocumentsChanged={refreshList}
                prescriptionKind={prescriptionKind}
                embedded
              />
            </View>
          ) : null}

          {patientId && linkMode === 'appointment' ? (
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
                    patientId={patientId}
                    appointmentId={appointmentId}
                    documents={docsQ.data ?? []}
                    onDocumentsChanged={refreshList}
                    prescriptionKind={prescriptionKind}
                    embedded
                  />
                </View>
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
  hero: { gap: spacing[1] },
  heroTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['2xl'],
    color: c.textPrimary,
  },
  heroDesc: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: c.textSecondary,
    lineHeight: fontSize.sm * 1.5,
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
  sectionHeader: {
    minWidth: 0,
  },
  sectionTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.lg,
    color: c.textPrimary,
  },
  sectionHint: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: c.textSecondary,
    lineHeight: fontSize.sm * 1.45,
  },
  skeletons: { gap: spacing[2] },
  pager: {
    marginTop: spacing[2],
    paddingTop: spacing[3],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.borderLight,
    gap: spacing[2],
  },
  pagerText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: c.textSecondary,
    textAlign: 'center' as const,
  },
  pagerBtns: {
    minWidth: 0,
  },
  composerWrap: {
    marginTop: spacing[2],
    paddingTop: spacing[4],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.borderLight,
  },
};
}
