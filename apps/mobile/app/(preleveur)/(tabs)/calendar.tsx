import { CalendarScreen } from '@/features/calendar/screens/CalendarScreen';
import { TitledTabScreenFrame } from '@/navigation/tab-screen-frames';

export default function PreleveurCalendar() {
  return (
    <TitledTabScreenFrame title="Agenda">
      <CalendarScreen title="Calendrier" detailPathPrefix="/(preleveur)/appointment" />
    </TitledTabScreenFrame>
  );
}
