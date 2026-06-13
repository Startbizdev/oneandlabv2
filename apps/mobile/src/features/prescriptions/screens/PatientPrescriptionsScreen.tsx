import { Stack } from 'expo-router';
import { PrescriptionWorkspaceScreen } from './PrescriptionWorkspaceScreen';

interface Props {
  patientId: string;
  rolePrefix: '/(pro)' | '/(nurse)';
  roleBase: 'pro' | 'nurse';
}

export function PatientPrescriptionsScreen({ patientId, rolePrefix, roleBase }: Props) {
  return (
    <>
      <Stack.Screen options={{ title: 'Ordonnances' }} />
      <PrescriptionWorkspaceScreen
        roleBase={roleBase}
        rolePrefix={rolePrefix}
        fixedPatientId={patientId}
      />
    </>
  );
}
