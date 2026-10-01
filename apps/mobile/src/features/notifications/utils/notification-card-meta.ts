import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Bell, CalendarClock, FlaskConical, MessageSquare, Pill, type LucideIcon } from 'lucide-react-native';
import {
  formatParisDayMonthYear,
  formatParisHm,
  formatParisWeekdayDate,
  parseParisWallClock,
} from '@/utils/paris-datetime';

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

export function notificationIcon(type?: string): LucideIcon {
  const t = (type ?? '').toLowerCase();
  if (t.includes('pharmacy_order') || t.includes('pharmacie')) return Pill;
  if (t.includes('result')) return FlaskConical;
  if (t.includes('appointment') || t.includes('rdv') || t.includes('booking')) return CalendarClock;
  if (t.includes('message') || t.includes('chat')) return MessageSquare;
  return Bell;
}
