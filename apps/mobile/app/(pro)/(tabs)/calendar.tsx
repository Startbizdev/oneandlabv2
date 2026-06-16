import { Calendar } from 'lucide-react-native';
import { TAB_HEADER_SF } from '@/components/navigation/RoleNativeTabsLayout';
import { CalendarScreen } from '@/features/calendar/screens/CalendarScreen';
import { TitledTabScreenFrame } from '@/navigation/tab-screen-frames';

export default function ProCalendar() {
  return (
    <TitledTabScreenFrame title="Calendrier" symbol={TAB_HEADER_SF.calendar} fallbackIcon={Calendar}>
      <CalendarScreen
        title="Calendrier"
        baseFilters={{ limit: 200 }}
        detailPathPrefix="/(pro)/appointment"
      />
    </TitledTabScreenFrame>
  );
}
