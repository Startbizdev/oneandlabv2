import { BookingWizardScreen } from '@/features/appointments/form/screens/BookingWizardScreen';

export default function ProNewAppointment() {
  return <BookingWizardScreen mode="dashboard" role="pro" basePath="/(pro)" />;
}
