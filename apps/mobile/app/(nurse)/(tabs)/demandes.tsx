import { ClipboardList } from 'lucide-react-native';
import { TAB_HEADER_SF } from '@/components/navigation/RoleNativeTabsLayout';
import { NurseDemandesScreen } from '@/features/nurse/screens/NurseDemandesScreen';
import { TitledTabScreenFrame } from '@/navigation/tab-screen-frames';

export default function NurseDemandes() {
  return (
    <TitledTabScreenFrame
      title="Mes demandes"
      symbol={TAB_HEADER_SF.demandes}
      fallbackIcon={ClipboardList}
    >
      <NurseDemandesScreen />
    </TitledTabScreenFrame>
  );
}
