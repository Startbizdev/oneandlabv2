import { PharmacyOrderWizardScreen } from '@/features/pharmacy-orders/screens/PharmacyOrderWizardScreen';
import { useLocalSearchParams } from 'expo-router';

export default function ProPharmacyOrderNewRoute() {
  const {
    patientId,
    pharmacy_id: pharmacyId,
    utm_qr: utmQr,
  } = useLocalSearchParams<{ patientId?: string; pharmacy_id?: string; utm_qr?: string }>();
  return (
    <PharmacyOrderWizardScreen
      rolePrefix="/(pro)"
      initialPatientId={patientId}
      initialPharmacyId={pharmacyId}
      utmQr={utmQr}
    />
  );
}
