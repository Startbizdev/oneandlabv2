import { useLocalSearchParams } from 'expo-router';
import { PharmacyLinkScreen } from '@/features/navigation/screens/DeepLinkScreens';

/** Lien universel `https://cary.bio/pharmacie/{id}?utm_qr=` (cible des QR pharmacie). */
export default function PharmacyLinkRoute() {
  const { id, utm_qr: utmQr } = useLocalSearchParams<{ id?: string; utm_qr?: string }>();
  return (
    <PharmacyLinkScreen
      pharmacyId={typeof id === 'string' ? id : ''}
      utmQr={typeof utmQr === 'string' && utmQr.trim() ? utmQr.trim() : null}
    />
  );
}
