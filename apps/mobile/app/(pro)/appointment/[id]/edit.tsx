import { useLocalSearchParams } from 'expo-router';
import { RescheduleAppointmentScreen } from '@/features/appointments/reschedule/screens/RescheduleAppointmentScreen';

export default function ProRescheduleAppointment() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <RescheduleAppointmentScreen
      appointmentId={id}
      role="pro"
      basePath="/(pro)"
    />
  );
}
