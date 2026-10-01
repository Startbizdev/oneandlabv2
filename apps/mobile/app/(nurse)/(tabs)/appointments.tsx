import { NurseAgendaScreen } from '@/features/nurse/screens/NurseAgendaScreen';
import { TabScreenFrame } from '@/components/navigation/TabScreenFrame';

export default function NurseAgendaTab() {
  return (
    <TabScreenFrame title="Agenda">
      <NurseAgendaScreen />
    </TabScreenFrame>
  );
}
