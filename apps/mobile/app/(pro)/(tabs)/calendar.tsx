import { CalendarScreen } from '@/features/calendar/screens/CalendarScreen';
import { TitledTabScreenFrame } from '@/navigation/tab-screen-frames';

export default function ProCalendar() {
  return (
    <TitledTabScreenFrame title="Agenda">
      <CalendarScreen
        title="Calendrier"
        baseFilters={{ limit: 200 }}
        detailPathPrefix="/(pro)/appointment"
      />
    </TitledTabScreenFrame>
  );
}
