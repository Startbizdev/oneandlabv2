import { BookingWizardScreen } from '@/features/appointments/form/screens/BookingWizardScreen';

export default function PreleveurNewAppointment() {
  return <BookingWizardScreen mode="dashboard" role="preleveur" basePath="/(preleveur)" />;
}
