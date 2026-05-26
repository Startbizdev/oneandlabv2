import { CalendarScreen } from '@/features/calendar/screens/CalendarScreen';

export default function PreleveurCalendar() {
  return (
    <CalendarScreen
      title="Calendrier"
      baseFilters={{ limit: 200 }}
      detailPathPrefix="/(preleveur)/appointment"
    />
  );
}
