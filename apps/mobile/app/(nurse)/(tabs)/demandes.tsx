import { TabScreenShell } from '@/components/navigation/TabScreenShell';
import { NurseDemandesScreen } from '@/features/nurse/screens/NurseDemandesScreen';

export default function NurseDemandes() {
  return (
    <TabScreenShell>
      <NurseDemandesScreen />
    </TabScreenShell>
  );
}
