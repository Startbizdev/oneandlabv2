import { BookingWizardScreen } from '@/features/appointments/form/screens/BookingWizardScreen';
import { useActiveTabRoute } from '@/lib/hooks/use-active-tab-route';

export default function PatientBookTab() {
  const isActiveTab = useActiveTabRoute('book');
  return (
    <BookingWizardScreen
      mode="patient"
      role="patient"
      basePath="/(patient)"
      embeddedInTab
      isActiveTab={isActiveTab}
    />
  );
}
