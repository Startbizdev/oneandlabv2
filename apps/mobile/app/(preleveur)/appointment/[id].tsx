import { useLocalSearchParams } from 'expo-router';
import { AppointmentDetailScreen } from '@/features/appointments/screens/AppointmentDetailScreen';
import { AlreadyAcceptedModal } from '@/features/appointments/detail/components/AlreadyAcceptedModal';

export default function PreleveurAppointmentDetail() {
  const { alreadyAccepted } = useLocalSearchParams<{ alreadyAccepted?: string }>();
  return (
    <>
      <AppointmentDetailScreen role="preleveur" />
      {alreadyAccepted === '1' ? <AlreadyAcceptedModal /> : null}
    </>
  );
}
