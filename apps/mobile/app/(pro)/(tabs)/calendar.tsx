import { TabScreenShell } from '@/components/navigation/TabScreenShell';
import { CalendarScreen } from '@/features/calendar/screens/CalendarScreen';

export default function ProCalendar() {
  return (
    <TabScreenShell>
      <CalendarScreen
        title="Calendrier"
        baseFilters={{ limit: 200 }}
        detailPathPrefix="/(pro)/appointment"
      />
    </TabScreenShell>
  );
}
