import { PharmacyOrderDetailScreen } from '@/features/pharmacy-orders/screens/PharmacyOrderDetailScreen';

export default function NursePharmacyOrderDetailRoute() {
  return <PharmacyOrderDetailScreen mode="sent" rolePrefix="/(nurse)" />;
}
