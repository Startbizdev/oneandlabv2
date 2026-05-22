import { useLocalSearchParams } from 'expo-router';
import { AppointmentFormScreen } from '@/features/appointments/form/screens/AppointmentFormScreen';

export default function PreleveurAppointmentEdit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <AppointmentFormScreen
      mode="edit"
      appointmentId={id}
      role="preleveur"
      basePath="/(preleveur)"
    />
  );
}
