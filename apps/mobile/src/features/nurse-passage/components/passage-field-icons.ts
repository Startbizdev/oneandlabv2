import { CalendarRange, Clock, MapPin, StickyNote, Syringe, Timer } from 'lucide-react-native';

export const PASSAGE_FIELD_ICONS = {
  planning: CalendarRange,
  time: Clock,
  location: MapPin,
  duration: Timer,
  care: Syringe,
  notes: StickyNote,
} as const;
