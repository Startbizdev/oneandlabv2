import { PrescriptionsScreen } from '@/features/prescriptions/screens/PrescriptionsScreen';
import { TitledTabScreenFrame } from '@/navigation/tab-screen-frames';

export default function ProPrescriptions() {
  return (
    <TitledTabScreenFrame
      title="Prescriptions"
    >
      <PrescriptionsScreen roleBase="pro" rolePrefix="/(pro)" />
    </TitledTabScreenFrame>
  );
}
