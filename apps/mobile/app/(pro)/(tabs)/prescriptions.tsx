import { PrescriptionsScreen } from '@/features/prescriptions/screens/PrescriptionsScreen';
import { TabScreenFrame } from '@/components/navigation/TabScreenFrame';

export default function ProPrescriptions() {
  return (
    <TabScreenFrame
      title="Prescriptions"
    >
      <PrescriptionsScreen roleBase="pro" rolePrefix="/(pro)" />
    </TabScreenFrame>
  );
}
