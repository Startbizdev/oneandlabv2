import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Bell, CalendarClock, MessageSquare, type LucideIcon } from 'lucide-react-native';
import {
  formatParisDayMonthYear,
  formatParisHm,
  formatParisWeekdayDate,
  parseParisWallClock,
} from '@/utils/paris-datetime';
import { getAppColors } from '@/theme/colors';

dayjs.extend(relativeTime);
dayjs.locale('fr');

/** Horodatage notification — toujours interprété / affiché en Europe/Paris. */
export function formatNotificationTime(iso?: string): string {
  const ms = parseParisWallClock(iso);
  if (ms == null) return '';

  const nowMs = Date.now();
  const diffMin = Math.floor((nowMs - ms) / 60000);
  if (diffMin < 60) return dayjs(ms).fromNow(true);

  const diffDay = Math.floor((nowMs - ms) / 86400000);
  if (diffDay < 1) return formatParisHm(ms);
  if (diffDay < 7) return formatParisWeekdayDate(ms);
  return formatParisDayMonthYear(ms);
}

export function notificationVisual(type?: string): {
  Icon: LucideIcon;
  color: string;
  bg: string;
} {
  const c = getAppColors();
  const t = (type ?? '').toLowerCase();
  if (t.includes('appointment') || t.includes('rdv') || t.includes('booking')) {
    return { Icon: CalendarClock, color: c.primary, bg: c.primaryLight };
  }
  if (t.includes('message') || t.includes('chat')) {
    return { Icon: MessageSquare, color: c.primaryDark, bg: c.primaryLight };
  }
  return { Icon: Bell, color: c.primary, bg: c.primaryLight };
}
