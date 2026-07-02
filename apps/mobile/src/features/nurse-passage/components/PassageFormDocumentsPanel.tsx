import { View } from 'react-native';
import type { PassagePrescriptionDraft } from '@/features/prescriptions/api/prescriptions.service';
import { ProfileDocumentsPremiumPanel } from '@/features/profile/components/ProfileDocumentsPremiumPanel';
import { PrescriptionWorkspaceScreen } from '@/features/prescriptions/screens/PrescriptionWorkspaceScreen';
import { usePassagePrescriptionGapsAlert } from '../hooks/use-passage-prescription-gaps-alert';
import { H_PADDING, spacing } from '@/theme';

type Props = {
  patientId: string;
  onPrescriptionDraft?: (draft: PassagePrescriptionDraft | null) => void;
};

export function PassageFormDocumentsPanel({ patientId, onPrescriptionDraft }: Props) {
  const { gapsAlert } = usePassagePrescriptionGapsAlert(patientId);

  return (
    <View style={{ gap: spacing[4], paddingHorizontal: H_PADDING, paddingBottom: spacing[10] }}>
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
