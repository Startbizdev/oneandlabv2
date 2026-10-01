import { CalendarScreen } from '@/features/calendar/screens/CalendarScreen';
import { TabScreenFrame } from '@/components/navigation/TabScreenFrame';

export default function PreleveurCalendar() {
  return (
    <TabScreenFrame title="Agenda">
      <CalendarScreen title="Agenda" rolePrefix="/(preleveur)" />
    </TabScreenFrame>
  );
}
