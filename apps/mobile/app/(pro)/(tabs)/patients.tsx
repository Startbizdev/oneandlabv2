import { TabScreenShell } from '@/components/navigation/TabScreenShell';
import { PatientsListScreen } from '@/features/patients/screens/PatientsListScreen';

export default function ProPatientsTab() {
  return (
    <TabScreenShell>
      <PatientsListScreen rolePrefix="/(pro)" />
    </TabScreenShell>
  );
}
