import { BookingWizardScreen } from '@/features/appointments/form/screens/BookingWizardScreen';

export default function PatientBookingNew() {
  return <BookingWizardScreen mode="patient" role="patient" basePath="/(patient)" />;
}
