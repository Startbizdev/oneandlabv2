import { BookingWizardScreen } from '@/features/appointments/form/screens/BookingWizardScreen';

export default function PatientBookTab() {
  return (
    <BookingWizardScreen mode="patient" role="patient" basePath="/(patient)" embeddedInTab />
  );
}
