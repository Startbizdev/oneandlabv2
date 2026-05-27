import { TabScreenShell } from '@/components/navigation/TabScreenShell';
import { PatientRelativesScreen } from '@/features/patient/screens/PatientRelativesScreen';

export default function PatientRelatives() {
  return (
    <TabScreenShell>
      <PatientRelativesScreen />
    </TabScreenShell>
  );
}
