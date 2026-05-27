import { TabScreenShell } from '@/components/navigation/TabScreenShell';
import { PatientsListScreen } from '@/features/patients/screens/PatientsListScreen';

export default function NursePatients() {
  return (
    <TabScreenShell>
      <PatientsListScreen rolePrefix="/(nurse)" />
    </TabScreenShell>
  );
}
