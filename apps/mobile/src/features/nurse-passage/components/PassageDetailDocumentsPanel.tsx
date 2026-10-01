import { View } from 'react-native';
import type { Appointment } from '@oneandlab/shared-types';
import type { MedicalDocumentRow } from '@/features/appointments/detail/api/appointment-detail.service';
import { RdvDocumentsPremiumPanel } from '@/features/appointments/detail/components/RdvDocumentsPremiumPanel';
import { PrescriptionWorkspaceScreen } from '@/features/prescriptions/screens/PrescriptionWorkspaceScreen';
import { usePassagePrescriptionGapsAlert } from '../hooks/use-passage-prescription-gaps-alert';
import { useStyles } from '@/theme';
import { buildPassageDocumentsPanelStyles } from './passage-documents-panel-styles';

type Props = {
  patientId: string;
  appointmentId: string;
  apt: Appointment;
  docs: MedicalDocumentRow[];
  docsLoading?: boolean;
  onDocumentsChanged?: () => void | Promise<void>;
};

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

  return (
    <View style={styles.panel}>
      {gapsAlert}
      <RdvDocumentsPremiumPanel
        appointmentId={appointmentId}
        apt={apt}
        role="nurse"
        docs={docs}
        loading={docsLoading}
        embedded
      />
      <PrescriptionWorkspaceScreen
        embedded
        roleBase="nurse"
        rolePrefix="/(nurse)"
        fixedPatientId={patientId}
        fixedAppointmentId={appointmentId}
        hideProfileGapsAlert
        onLinkedDocumentsChanged={onDocumentsChanged}
      />
    </View>
  );
}
