import { StackChromeScreen } from '@/navigation/StackChromeScreen';
import { PrescriptionsScreen } from '@/features/prescriptions/screens/PrescriptionsScreen';

export default function NursePrescriptions() {
  return (
    <StackChromeScreen>
      <PrescriptionsScreen roleBase="nurse" rolePrefix="/(nurse)" />
    </StackChromeScreen>
  );
}
