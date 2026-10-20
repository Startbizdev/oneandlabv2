import { useLocalSearchParams } from 'expo-router';
import { QrLinkScreen } from '@/features/navigation/screens/DeepLinkScreens';

/** Lien universel `https://cary.bio/qr/{token}` (QR code d'un professionnel). */
export default function QrLinkRoute() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  return <QrLinkScreen token={typeof token === 'string' ? token : ''} />;
}
