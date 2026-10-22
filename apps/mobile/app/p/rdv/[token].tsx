import { useLocalSearchParams } from 'expo-router';
import { SharedAppointmentLinkScreen } from '@/features/navigation/screens/DeepLinkScreens';

/** Lien universel `https://cary.bio/p/rdv/{token}` (demande de soins partagée à un infirmier). */
export default function SharedAppointmentLinkRoute() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  return <SharedAppointmentLinkScreen token={typeof token === 'string' ? token : ''} />;
}
