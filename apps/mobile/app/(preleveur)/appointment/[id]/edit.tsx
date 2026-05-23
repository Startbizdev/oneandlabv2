import { useLocalSearchParams } from 'expo-router';
import { RescheduleAppointmentScreen } from '@/features/appointments/reschedule/screens/RescheduleAppointmentScreen';

export default function PreleveurRescheduleAppointment() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <RescheduleAppointmentScreen
      appointmentId={id}
      role="preleveur"
      basePath="/(preleveur)"
    />
  );
}
