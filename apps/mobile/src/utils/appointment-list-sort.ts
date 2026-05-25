import dayjs from 'dayjs';
import type { Appointment } from '@oneandlab/shared-types';
import { isBloodTestAppointment, isNursingAppointment } from '@oneandlab/shared-utils';
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

/** Réassocie les cartes « single » qui partagent un lot déjà présent dans la liste chargée. */
function coalesceBatchSinglesFromList(
  rows: AppointmentListRow[],
  sorted: Appointment[],
): AppointmentListRow[] {
  const batchSizeByKey = new Map<string, number>();
  for (const a of sorted) {
    const bid = a.creation_batch_id;
    if (!bid) continue;
    const ty = a.type;
    if (!isBloodTestAppointment(ty) && !isNursingAppointment(ty)) continue;
    const normalizedType = isBloodTestAppointment(ty) ? 'blood_test' : 'nursing';
    const key = `${normalizedType}:${bid}`;
    batchSizeByKey.set(key, (batchSizeByKey.get(key) ?? 0) + 1);
  }

  const out: AppointmentListRow[] = [];
  const emittedBatch = new Set<string>();

  for (const row of rows) {
    if (row.kind === 'batch') {
      out.push(row);
      emittedBatch.add(row.key);
      continue;
    }
    const a = row.appointment;
    const bid = a.creation_batch_id;
    const ty = a.type;
    if (!bid || (!isBloodTestAppointment(ty) && !isNursingAppointment(ty))) {
      out.push(row);
      continue;
    }
    const normalizedType = isBloodTestAppointment(ty) ? 'blood_test' : 'nursing';
    const key = `${normalizedType}:${bid}`;
    const batchSize = batchSizeByKey.get(key) ?? 0;
    if (batchSize <= 1) {
      out.push(row);
      continue;
    }
    if (emittedBatch.has(key)) {
      continue;
    }
    const group = sorted.filter(
      (x) =>
        x.creation_batch_id === bid &&
        (normalizedType === 'blood_test'
          ? isBloodTestAppointment(x.type)
          : isNursingAppointment(x.type)),
    );
    if (group.length <= 1) {
      out.push(row);
      continue;
    }
    emittedBatch.add(key);
    out.push({
      kind: 'batch',
      appointments: [...group].sort(
        (x, y) =>
          new Date(x.scheduled_at || x.created_at || 0).getTime() -
          new Date(y.scheduled_at || y.created_at || 0).getTime(),
      ),
      key,
    });
  }
  return out;
}

export function buildAppointmentDisplayRows(
  list: Appointment[],
  options: {
    direction?: AppointmentListSortDirection;
    groupMode?: AppointmentListGroupMode;
  } = {},
): AppointmentListRow[] {
  const direction = options.direction ?? 'upcoming';
  const sorted = sortAppointmentsForList(list, direction);
  let rows =
    options.groupMode === 'nurse-demandes'
      ? groupAppointmentsForNurseMesDemandes(sorted)
      : groupAppointmentsByBatch(sorted);
  if (options.groupMode !== 'nurse-demandes') {
    rows = coalesceBatchSinglesFromList(rows, sorted);
  }
  return sortAppointmentListRows(rows, direction);
}
