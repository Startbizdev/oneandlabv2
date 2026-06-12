import type { AppColors } from '@/theme/colors';
import { getThemedStyles } from '@/theme/use-themed-styles';
import { colors } from '@/theme';
import { useState } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { FilePenLine } from 'lucide-react-native';
import { KeyboardScrollView } from '@/components/layout/KeyboardScrollView';
import { Button } from '@/components/ui/Button';
import { SelectField } from '@/components/ui/SelectField';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonList } from '@/components/ui/skeletons';
import { fetchMedicalDocuments } from '@/features/appointments/detail/api/appointment-detail.service';
import { fetchAppointmentsPaginated } from '@/features/appointments/api/appointments.service';
import { cacheMedicalDocument, openMedicalDocument } from '@/lib/downloads/download-medical-document';
import { useToast } from '@/providers/ToastProvider';
import { PrescriptionComposer } from '../components/PrescriptionComposer';
import { PrescriptionHistoryCard } from '../components/PrescriptionHistoryCard';
import {
  fetchNursePrescriptions,
  fetchProPrescriptions,
  type PrescriptionLinkMode,
} from '../api/prescriptions.service';
import { appointmentOptionLabel } from '../utils/prescription-display';
import { MedicalDocumentPreviewModal } from '@/features/documents/components/MedicalDocumentPreviewModal';
import { spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  patientId: string;
  rolePrefix: '/(pro)' | '/(nurse)';
  roleBase: 'pro' | 'nurse';
}

export function PatientPrescriptionsScreen({ patientId, rolePrefix, roleBase }: Props) {
  const router = useRouter();
  const { show: toast } = useToast();
  const prescriptionKind = roleBase === 'nurse' ? 'nursing' : 'medical';
  const [linkMode, setLinkMode] = useState<PrescriptionLinkMode>('standalone');
  const [appointmentId, setAppointmentId] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
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

  const appointmentsQ = useQuery({
    queryKey: ['prescriptions', 'patient-appointments', patientId] as const,
    queryFn: async () => {
      const { appointments } = await fetchAppointmentsPaginated({
        patient_id: patientId,
        limit: 80,
        page: 1,
      });
      return appointments.filter((a) => (prescriptionKind === 'nursing' ? a.type === 'nursing' : true));
    },
    enabled: Boolean(patientId),
  });

  const docsQ = useQuery({
    queryKey: ['prescriptions', 'appointment-docs', appointmentId] as const,
    queryFn: async () => (await fetchMedicalDocuments(appointmentId)).data ?? [],
    enabled: Boolean(appointmentId),
  });

  const appointmentOptions = (appointmentsQ.data ?? []).map((a) => ({
    value: a.id,
    label: appointmentOptionLabel(a),
  }));

  async function previewDoc(docId: string, fileName?: string) {
    try {
      const r = await cacheMedicalDocument(docId, fileName);
      if (!r.ok || !r.localUri) {
        toast(r.error ?? 'Aperçu impossible', { type: 'error' });
        return;
      }
      setPreviewUri(r.localUri);
      setPreviewFileName(fileName ?? 'ordonnance.pdf');
      setPreviewOpen(true);
    } catch (e) {
      toast('Aperçu impossible', { type: 'error' });
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
            (listQ.data ?? []).map((row) => (
              <PrescriptionHistoryCard
                key={row.id}
                row={row}
                showPatient={false}
                downloading={downloadingId === row.id}
                onDownload={() => downloadDoc(row.id, row.file_name)}
                onPreview={() => previewDoc(row.id, row.file_name)}
                onOpenAppointment={
                  row.appointment_id
                    ? () =>
                        router.push(
                          `${rolePrefix}/appointment/${row.appointment_id}` as never,
                        )
                    : undefined
                }
              />
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Créer</Text>
          <View style={styles.linkRow}>
            <Button
              title="Sans RDV"
              size="sm"
              variant={linkMode === 'standalone' ? 'primary' : 'outline'}
              onPress={() => {
                setLinkMode('standalone');
                setAppointmentId('');
              }}
            />
            <Button
              title="Liée au RDV"
              size="sm"
              variant={linkMode === 'appointment' ? 'primary' : 'outline'}
              onPress={() => setLinkMode('appointment')}
            />
          </View>
          {linkMode === 'appointment' ? (
            <SelectField
              label="Rendez-vous"
              value={appointmentId}
              onChange={setAppointmentId}
              options={appointmentOptions}
              placeholder="Choisir un rendez-vous…"
              sheetTitle="Rendez-vous"
            />
          ) : null}
          {linkMode === 'standalone' || appointmentId ? (
            <PrescriptionComposer
              patientId={patientId}
              appointmentId={linkMode === 'appointment' ? appointmentId : null}
              documents={docsQ.data ?? []}
              prescriptionKind={prescriptionKind}
              onDocumentsChanged={async () => {
                await docsQ.refetch();
                await listQ.refetch();
              }}
              embedded
            />
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
    screen: { flex: 1, backgroundColor: c.background },
    content: { padding: spacing[4], gap: spacing[5], paddingBottom: spacing[8] },
    section: { gap: spacing[3] },
    sectionTitle: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.lg,
      color: c.textPrimary,
    },
    linkRow: {
      flexDirection: 'row',
      gap: spacing[2],
      flexWrap: 'wrap',
    },
  };
}

const styles = new Proxy({} as Record<string, any>, {
  get(_target, prop: string | symbol) {
    if (typeof prop === 'string') {
      return getThemedStyles(
        'features_prescriptions_screens_PatientPrescriptionsScreen_tsx_styles',
        buildStyles,
      )[prop];
    }
    return undefined;
  },
});
