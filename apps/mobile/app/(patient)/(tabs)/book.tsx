import { TabScreenShell } from '@/components/navigation/TabScreenShell';
import { BookingWizardScreen } from '@/features/appointments/form/screens/BookingWizardScreen';

export default function PatientBookTab() {
  return (
    <TabScreenShell>
      <BookingWizardScreen mode="patient" role="patient" basePath="/(patient)" />
    </TabScreenShell>
  );
}
