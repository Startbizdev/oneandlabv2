import { TabScreenShell } from '@/components/navigation/TabScreenShell';
import { CalendarScreen } from '@/features/calendar/screens/CalendarScreen';

export default function PreleveurCalendar() {
  return (
    <TabScreenShell>
      <CalendarScreen title="Calendrier" detailPathPrefix="/(preleveur)/appointment" />
    </TabScreenShell>
  );
}
