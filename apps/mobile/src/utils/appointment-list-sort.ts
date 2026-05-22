import dayjs from 'dayjs';
import type { Appointment } from '@oneandlab/shared-types';
import {
  groupAppointmentsByBatch,
  groupAppointmentsForNurseMesDemandes,
  type AppointmentListRow,
} from '@/utils/appointment-batch';

export type AppointmentListSortDirection = 'upcoming' | 'past';

export function appointmentListPrimaryApt(row: AppointmentListRow): Appointment {
  if (row.kind === 'single') return row.appointment;
  const sorted = [...row.appointments].sort(
    (a, b) =>
      new Date(a.scheduled_at || a.created_at || 0).getTime() -
      new Date(b.scheduled_at || b.created_at || 0).getTime(),
  );
  return sorted[0]!;
}

/** RDV prévu le jour même (badge « Aujourd'hui »). */
export function isAppointmentScheduledToday(apt: Appointment): boolean {
  if (!apt.scheduled_at) return false;
  return dayjs(apt.scheduled_at).isSame(dayjs(), 'day');
}

function compareBySchedule(
  a: Appointment,
  b: Appointment,
  direction: AppointmentListSortDirection,
): number {
  const todayA = isAppointmentScheduledToday(a);
  const todayB = isAppointmentScheduledToday(b);
  if (todayA !== todayB) return todayA ? -1 : 1;

  const da = dayjs(a.scheduled_at || a.created_at || 0).valueOf();
  const db = dayjs(b.scheduled_at || b.created_at || 0).valueOf();
  if (da !== db) return direction === 'upcoming' ? da - db : db - da;

  return String(a.id).localeCompare(String(b.id));
}

/** Tri des RDV : aujourd'hui en premier, puis date croissante (à venir) ou décroissante (passés). */
export function sortAppointmentsForList(
  list: Appointment[],
  direction: AppointmentListSortDirection = 'upcoming',
): Appointment[] {
  return [...list].sort((a, b) => compareBySchedule(a, b, direction));
}

export function sortAppointmentListRows(
  rows: AppointmentListRow[],
  direction: AppointmentListSortDirection = 'upcoming',
): AppointmentListRow[] {
  return [...rows].sort((ra, rb) =>
    compareBySchedule(
      appointmentListPrimaryApt(ra),
      appointmentListPrimaryApt(rb),
      direction,
    ),
  );
}

export type AppointmentListGroupMode = 'batch' | 'nurse-demandes';

export function buildAppointmentDisplayRows(
  list: Appointment[],
  options: {
    direction?: AppointmentListSortDirection;
    groupMode?: AppointmentListGroupMode;
  } = {},
): AppointmentListRow[] {
  const direction = options.direction ?? 'upcoming';
  const sorted = sortAppointmentsForList(list, direction);
  const rows =
    options.groupMode === 'nurse-demandes'
      ? groupAppointmentsForNurseMesDemandes(sorted)
      : groupAppointmentsByBatch(sorted);
  return sortAppointmentListRows(rows, direction);
}
