import { appointmentDayFrance } from '@oneandlab/shared-utils';
import type { AppointmentListRow } from '@/utils/appointment-batch';
import { appointmentListPrimaryApt } from '@/utils/appointment-list-sort';
import { formatFrenchWeekdayDate } from '@/utils/appointment-datetime-fr';

export type AppointmentListSectionHeader = { kind: 'section'; key: string; label: string };

/** Ligne de liste RDV : carte (simple ou lot) ou en-tête de jour. */
export type AppointmentListItem = AppointmentListRow | AppointmentListSectionHeader;

const UNDATED_LABEL = 'Date à confirmer';

function shiftDayKey(dayKey: string, days: number): string {
  const [y, m, d] = dayKey.split('-').map(Number);
  if (!y || !m || !d) return '';
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** « Aujourd'hui », « Demain », « Hier », sinon « Mardi 6 octobre » (année si différente). */
export function appointmentDaySectionLabel(
  scheduledAt: string | null | undefined,
  now: Date = new Date(),
): string {
  const dayKey = scheduledAt ? appointmentDayFrance(scheduledAt) : '';
  if (!dayKey) return UNDATED_LABEL;
  const todayKey = appointmentDayFrance(now);
  if (dayKey === todayKey) return "Aujourd'hui";
  if (dayKey === shiftDayKey(todayKey, 1)) return 'Demain';
  if (dayKey === shiftDayKey(todayKey, -1)) return 'Hier';
  const sameYear = dayKey.slice(0, 4) === todayKey.slice(0, 4);
  return formatFrenchWeekdayDate(scheduledAt, sameYear ? 'dddd D MMMM' : 'dddd D MMMM YYYY')
    || UNDATED_LABEL;
}

/** Insère un en-tête à chaque changement de jour (lignes déjà triées). */
export function withAppointmentDaySections(
  rows: AppointmentListRow[],
  now: Date = new Date(),
): AppointmentListItem[] {
  const items: AppointmentListItem[] = [];
  let currentDay: string | null = null;
  rows.forEach((row, index) => {
    const scheduledAt = appointmentListPrimaryApt(row).scheduled_at;
    const dayKey = (scheduledAt && appointmentDayFrance(scheduledAt)) || 'undated';
    if (dayKey !== currentDay) {
      currentDay = dayKey;
      items.push({
        kind: 'section',
        key: `section:${dayKey}:${index}`,
        label: appointmentDaySectionLabel(scheduledAt, now),
      });
    }
    items.push(row);
  });
  return items;
}

export function appointmentListItemKey(item: AppointmentListItem): string {
  if (item.kind === 'section') return item.key;
  return item.kind === 'batch' ? item.key : item.appointment.id;
}
