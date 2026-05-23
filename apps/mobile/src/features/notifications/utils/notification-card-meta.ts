import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Bell, CalendarClock, MessageSquare, type LucideIcon } from 'lucide-react-native';
import { colors } from '@/theme';

dayjs.extend(relativeTime);
dayjs.locale('fr');

export function formatNotificationTime(iso?: string): string {
  if (!iso) return '';
  const d = dayjs(iso);
  const now = dayjs();
  if (now.diff(d, 'minute') < 60) return d.fromNow(true);
  if (now.diff(d, 'day') < 1) return d.format('HH:mm');
  if (now.diff(d, 'day') < 7) return d.format('ddd D MMM');
  return d.format('D MMM YYYY');
}

export function notificationVisual(type?: string): {
  Icon: LucideIcon;
  color: string;
  bg: string;
} {
  const t = (type ?? '').toLowerCase();
  if (t.includes('appointment') || t.includes('rdv') || t.includes('booking')) {
    return { Icon: CalendarClock, color: colors.primary, bg: colors.primaryLight };
  }
  if (t.includes('message') || t.includes('chat')) {
    return { Icon: MessageSquare, color: colors.primaryDark, bg: colors.primaryLight };
  }
  return { Icon: Bell, color: colors.primary, bg: colors.primaryLight };
}
