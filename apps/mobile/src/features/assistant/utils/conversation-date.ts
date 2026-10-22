import dayjs from 'dayjs';
import 'dayjs/locale/fr';

/** Date courte d'une conversation : « Aujourd'hui, 08:45 », « Hier, 18:02 », « 12 oct. », « 3 déc. 2025 ». */
export function conversationDateLabel(iso: string, now: Date = new Date()): string {
  const date = dayjs(iso).locale('fr');
  const today = dayjs(now);
  if (date.isSame(today, 'day')) return `Aujourd’hui, ${date.format('HH:mm')}`;
  if (date.isSame(today.subtract(1, 'day'), 'day')) return `Hier, ${date.format('HH:mm')}`;
  return date.format(date.isSame(today, 'year') ? 'D MMM' : 'D MMM YYYY');
}
