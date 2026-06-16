import { FileText } from 'lucide-react-native';
import { TAB_HEADER_SF } from '@/components/navigation/RoleNativeTabsLayout';
import { PrescriptionsScreen } from '@/features/prescriptions/screens/PrescriptionsScreen';
import { TitledTabScreenFrame } from '@/navigation/tab-screen-frames';

export default function ProPrescriptions() {
  return (
    <TitledTabScreenFrame
      title="Prescriptions"
      symbol={TAB_HEADER_SF.prescriptions}
      fallbackIcon={FileText}
    >
      <PrescriptionsScreen roleBase="pro" rolePrefix="/(pro)" />
    </TitledTabScreenFrame>
  );
}
