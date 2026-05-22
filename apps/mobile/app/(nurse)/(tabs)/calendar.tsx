import { CalendarScreen } from '@/features/calendar/screens/CalendarScreen';

export default function NurseCalendar() {
  return (
    <CalendarScreen
      title="Calendrier"
      baseFilters={{ limit: 200 }}
      detailPathPrefix="/(nurse)/appointment"
      nurseCalendar
    />
  );
}
