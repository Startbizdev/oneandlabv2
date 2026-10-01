import { View } from 'react-native';
import type { PassagePrescriptionDraft } from '@/features/prescriptions/api/prescriptions.service';
import { ProfileDocumentsPremiumPanel } from '@/features/profile/components/ProfileDocumentsPremiumPanel';
import { PrescriptionWorkspaceScreen } from '@/features/prescriptions/screens/PrescriptionWorkspaceScreen';
import { usePassagePrescriptionGapsAlert } from '../hooks/use-passage-prescription-gaps-alert';
import { useStyles } from '@/theme';
import { buildPassageDocumentsPanelStyles } from './passage-documents-panel-styles';

type Props = {
  patientId: string;
  onPrescriptionDraft?: (draft: PassagePrescriptionDraft | null) => void;
};

export function PassageFormDocumentsPanel({ patientId, onPrescriptionDraft }: Props) {
  const styles = useStyles(buildPassageDocumentsPanelStyles);
  const { gapsAlert } = usePassagePrescriptionGapsAlert(patientId);

  return (
    <View style={styles.panel}>
      {gapsAlert}
      <ProfileDocumentsPremiumPanel embedded patientUserId={patientId} />
      <PrescriptionWorkspaceScreen
        embedded
        roleBase="nurse"
        rolePrefix="/(nurse)"
        fixedPatientId={patientId}
        forPassageDraft
        hideProfileGapsAlert
        onPassagePrescriptionDraft={onPrescriptionDraft}
      />
    </View>
  );
}
