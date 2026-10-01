import { CalendarScreen } from '@/features/calendar/screens/CalendarScreen';
import { TabScreenFrame } from '@/components/navigation/TabScreenFrame';

export default function ProCalendar() {
  return (
    <TabScreenFrame title="Agenda">
      <CalendarScreen
        title="Agenda"
        baseFilters={{ limit: 200 }}
        rolePrefix="/(pro)"
      />
    </TabScreenFrame>
  );
}
