import { CalendarScreen } from '@/features/calendar/screens/CalendarScreen';

export default function ProCalendar() {
  return (
    <CalendarScreen title="Calendrier" baseFilters={{ limit: 200 }} detailPathPrefix="/(pro)/appointment" />
  );
}
