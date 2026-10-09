import { View } from 'react-native';
import type { Appointment } from '@oneandlab/shared-types';
import type { MedicalDocumentRow } from '@/features/appointments/detail/api/appointment-detail.service';
import { RdvDocumentsPremiumPanel } from '@/features/appointments/detail/components/RdvDocumentsPremiumPanel';
import { PrescriptionWorkspaceScreen } from '@/features/prescriptions/screens/PrescriptionWorkspaceScreen';
import { canUploadMedicalDocumentsForAppointmentStatus } from '@/utils/appointment-documents-upload';
import { usePassagePrescriptionGapsAlert } from '../hooks/use-passage-prescription-gaps-alert';
import { AppText, useStyles } from '@/theme';
import { buildPassageDocumentsPanelStyles } from './passage-documents-panel-styles';

type Props = {
  patientId: string;
  appointmentId: string;
  apt: Appointment;
  docs: MedicalDocumentRow[];
  docsLoading?: boolean;
  onDocumentsChanged?: () => void | Promise<void>;
};

/** Passage annulé ou clôturé : documents consultables, ni ajout ni ordonnance (refusés par l'API). */
function closedPassageMessage(status: unknown): string {
  const s = String(status ?? '').toLowerCase();
  if (s === 'canceled' || s === 'cancelled') {
    return 'Passage annulé : les documents restent consultables, mais vous ne pouvez plus en ajouter ni rédiger d’ordonnance pour ce passage.';
  }
  return 'Passage clôturé : les documents restent consultables, mais vous ne pouvez plus en ajouter ni rédiger d’ordonnance pour ce passage.';
}

export function PassageDetailDocumentsPanel({
  patientId,
  appointmentId,
  apt,
  docs,
  docsLoading,
  onDocumentsChanged,
}: Props) {
  const styles = useStyles(buildPassageDocumentsPanelStyles);
  const { gapsAlert } = usePassagePrescriptionGapsAlert(patientId);
  const editable = canUploadMedicalDocumentsForAppointmentStatus(apt.status);

  return (
    <View style={styles.panel}>
      {editable ? (
        gapsAlert
      ) : (
        <View style={styles.notice} accessibilityRole="alert">
          <AppText style={styles.noticeText}>{closedPassageMessage(apt.status)}</AppText>
        </View>
      )}
      <View style={styles.section}>
        <AppText variant="headline" accessibilityRole="header">
          Documents du passage
        </AppText>
        <RdvDocumentsPremiumPanel
          appointmentId={appointmentId}
          apt={apt}
          role="nurse"
          docs={docs}
          loading={docsLoading}
          embedded
        />
      </View>
      {editable ? (
        <PrescriptionWorkspaceScreen
          embedded
          roleBase="nurse"
          rolePrefix="/(nurse)"
          fixedPatientId={patientId}
          fixedAppointmentId={appointmentId}
          hideProfileGapsAlert
          onLinkedDocumentsChanged={onDocumentsChanged}
        />
      ) : null}
    </View>
  );
}
