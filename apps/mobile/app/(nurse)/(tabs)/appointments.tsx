import { NurseAgendaScreen } from '@/features/nurse/screens/NurseAgendaScreen';
import { TitledTabScreenFrame } from '@/navigation/tab-screen-frames';

export default function NurseAgendaTab() {
  return (
    <TitledTabScreenFrame title="Agenda">
      <NurseAgendaScreen />
    </TitledTabScreenFrame>
  );
}
