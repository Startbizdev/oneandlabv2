import type { AppColors } from '@/theme/colors';
import { getThemedStyles } from '@/theme/use-themed-styles';
import { colors } from '@/theme';
import { useMemo, useState } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import { KeyboardScrollView } from '@/components/layout/KeyboardScrollView';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { FilePenLine, History, PlusCircle } from 'lucide-react-native';
import type { Appointment } from '@oneandlab/shared-types';
import { fetchAllPatients } from '@/features/patients/api/fetch-all-patients';
import { patientPickerOptionFromRow } from '@/features/patients/utils/patient-contact-display';
import { fetchMedicalDocuments } from '@/features/appointments/detail/api/appointment-detail.service';
import { fetchAppointmentsPaginated } from '@/features/appointments/api/appointments.service';
import { SelectField } from '@/components/ui/SelectField';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonList } from '@/components/ui/skeletons';
import { Button } from '@/components/ui/Button';
import { queryKeys } from '@/lib/query-keys';
import { cacheMedicalDocument, openMedicalDocument } from '@/lib/downloads/download-medical-document';
import { useToast } from '@/providers/ToastProvider';
import { MedicalDocumentPreviewModal } from '@/features/documents/components/MedicalDocumentPreviewModal';
import { PrescriptionComposer } from '../components/PrescriptionComposer';
import { PrescriptionHistoryCard } from '../components/PrescriptionHistoryCard';
import { fetchNursePrescriptions, fetchProPrescriptions, type PrescriptionLinkMode } from '../api/prescriptions.service';
import { appointmentOptionLabel } from '../utils/prescription-display';
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
  const prescriptionKind = roleBase === 'nurse' ? 'nursing' : 'medical';
  const router = useRouter();
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

  const appointmentsQ = useQuery({
    queryKey: ['prescriptions', 'appointments', patientId] as const,
    queryFn: async () => {
      const { appointments } = await fetchAppointmentsPaginated({
        patient_id: patientId,
        limit: 80,
        page: 1,
      });
      return appointments.filter((a) =>
        prescriptionKind === 'nursing' ? a.type === 'nursing' : true,
      );
    },
    enabled: Boolean(patientId),
  });

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

  const appointmentOptions = useMemo(
    () =>
      (appointmentsQ.data ?? []).map((a: Appointment) => ({
        value: a.id,
        label: appointmentOptionLabel(a),
      })),
    [appointmentsQ.data],
  );

  const pagination = listQ.data?.pagination;
  const totalPages = Math.max(1, pagination?.pages ?? 1);

  async function refreshList() {
    await listQ.refetch();
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
            Documents générés ou enregistrés pour vos patients, liés à un rendez-vous.
          </Text>
        </View>

        <View style={[styles.section, elevation.xs]}>
          <View style={styles.sectionHeader}>
            <History size={20} color={colors.primary} strokeWidth={2} />
            <Text style={styles.sectionTitle}>Historique</Text>
          </View>

          {listQ.isLoading ? (
            <SkeletonList count={2} itemHeight={72} gap={spacing[2]} />
          ) : (listQ.data?.rows ?? []).length === 0 ? (
            <EmptyState
              Icon={FilePenLine}
              title="Aucune ordonnance"
              description="Les ordonnances enregistrées apparaîtront ici."
            />
          ) : (
            <View style={styles.list}>
              {(listQ.data?.rows ?? []).map((row) => (
                <PrescriptionHistoryCard
                  key={row.id}
                  row={row}
                  showPatient
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
            </View>
          )}

          {totalPages > 1 ? (
            <View style={styles.pager}>
              <Text style={styles.pagerText}>
                Page {page} / {totalPages}
                {pagination?.total != null ? ` · ${pagination.total} ordonnance(s)` : ''}
              </Text>
              <View style={styles.pagerBtns}>
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
              </View>
            </View>
          ) : null}
        </View>

        <View style={[styles.section, elevation.xs]}>
          <View style={styles.sectionHeader}>
            <PlusCircle size={20} color={colors.primary} strokeWidth={2} />
            <Text style={styles.sectionTitle}>Nouvelle ordonnance</Text>
          </View>
          <Text style={styles.sectionHint}>
            Choisissez un patient, puis générez avec ou sans lien vers un rendez-vous.
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
            <View style={styles.linkRow}>
              <Button
                title="Sans RDV"
                size="sm"
                variant={linkMode === 'standalone' ? 'primary' : 'outline'}
                onPress={() => onLinkModeChange('standalone')}
              />
              <Button
                title="Liée au RDV"
                size="sm"
                variant={linkMode === 'appointment' ? 'primary' : 'outline'}
                onPress={() => onLinkModeChange('appointment')}
              />
            </View>
          ) : null}

          {patientId && linkMode === 'appointment' ? (
            <SelectField
              label="Rendez-vous"
              value={appointmentId}
              options={appointmentOptions}
              onChange={setAppointmentId}
              placeholder={
                appointmentsQ.isLoading
                  ? 'Chargement…'
                  : 'Sélectionner un rendez-vous…'
              }
              sheetTitle="Rendez-vous"
            />
          ) : null}

          {patientId && linkMode === 'appointment' && !appointmentsQ.isLoading && appointmentOptions.length === 0 ? (
            <Text style={styles.warn}>
              Aucun rendez-vous — utilisez « Sans RDV » pour générer quand même.
            </Text>
          ) : null}

          {patientId && (linkMode === 'standalone' || appointmentId) ? (
            <View style={styles.composerWrap}>
              <PrescriptionComposer
                patientId={patientId}
                appointmentId={linkMode === 'appointment' ? appointmentId : null}
                documents={docsQ.data ?? []}
                onDocumentsChanged={refreshList}
                prescriptionKind={prescriptionKind}
                embedded
              />
            </View>
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
  container: { flex: 1, backgroundColor: c.background },
  scroll: { flex: 1 },
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
    gap: spacing[3],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
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
  list: { gap: spacing[2] },
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
    textAlign: 'center',
  },
  pagerBtns: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing[2],
  },
  warn: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: c.warning,
  },
  linkRow: {
    flexDirection: 'row',
    gap: spacing[2],
    flexWrap: 'wrap',
  },
  composerWrap: {
    marginTop: spacing[2],
    paddingTop: spacing[4],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.borderLight,
  },
};
}

const styles = new Proxy({} as Record<string, any>, {
  get(_target, prop: string | symbol) {
    if (typeof prop === 'string') {
      return getThemedStyles('features_prescriptions_screens_PrescriptionsScreen_tsx_styles', buildStyles)[prop];
    }
    return undefined;
  },
});
