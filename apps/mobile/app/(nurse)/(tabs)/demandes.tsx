import { NurseDemandesScreen } from '@/features/nurse/screens/NurseDemandesScreen';
import { TabScreenFrame } from '@/components/navigation/TabScreenFrame';

export default function NurseDemandes() {
  return (
    <TabScreenFrame
      title="Mes demandes"
    >
      <NurseDemandesScreen />
    </TabScreenFrame>
  );
}
