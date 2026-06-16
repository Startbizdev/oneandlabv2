import { StackChromeScreen } from '@/navigation/StackChromeScreen';
import { HeaderTitleText } from '@/navigation/HeaderTitle';
import { PrescriptionWorkspaceScreen } from './PrescriptionWorkspaceScreen';

interface Props {
  patientId: string;
  rolePrefix: '/(pro)' | '/(nurse)';
  roleBase: 'pro' | 'nurse';
}

export function PatientPrescriptionsScreen({ patientId, rolePrefix, roleBase }: Props) {
  return (
    <StackChromeScreen title={<HeaderTitleText title="Ordonnances" />}>
      <PrescriptionWorkspaceScreen
        roleBase={roleBase}
        rolePrefix={rolePrefix}
        fixedPatientId={patientId}
      />
    </StackChromeScreen>
  );
}
