import { LabResultsScreen } from '@/features/lab-results/screens/LabResultsScreen';
import { HeaderNotificationBell } from '@/navigation/HeaderNotificationButton';
import { StackChromeTabRoot } from '@/navigation/stack-chrome-tab-root';

export default function PatientResultsTab() {
  return (
    <StackChromeTabRoot title="Mes résultats" headerRight={<HeaderNotificationBell />}>
      <LabResultsScreen role="patient" rolePrefix="/(patient)" />
    </StackChromeTabRoot>
  );
}
