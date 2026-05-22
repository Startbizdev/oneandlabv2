import { BookingWizardScreen } from '@/features/appointments/form/screens/BookingWizardScreen';

export default function NurseNewAppointment() {
  return <BookingWizardScreen mode="dashboard" role="nurse" basePath="/(nurse)" />;
}
