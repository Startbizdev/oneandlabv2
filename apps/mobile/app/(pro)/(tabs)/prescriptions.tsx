import { TabScreenShell } from '@/components/navigation/TabScreenShell';
import { PrescriptionsScreen } from '@/features/prescriptions/screens/PrescriptionsScreen';

export default function ProPrescriptions() {
  return (
    <TabScreenShell>
      <PrescriptionsScreen />
    </TabScreenShell>
  );
}
