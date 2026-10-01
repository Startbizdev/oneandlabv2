import { StackChromeScreen } from '@/navigation/StackChromeScreen';
import { PrescriptionsScreen } from '@/features/prescriptions/screens/PrescriptionsScreen';

export default function ProPrescriptionsStack() {
  return (
    <StackChromeScreen title="Ordonnances">
      <PrescriptionsScreen roleBase="pro" rolePrefix="/(pro)" />
    </StackChromeScreen>
  );
}
