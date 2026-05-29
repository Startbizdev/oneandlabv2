import type { Appointment } from '@oneandlab/shared-types';
import { isBloodTestAppointment, isNursingAppointment } from '@oneandlab/shared-utils';

export const MULTI_BLOOD_TEST_ITEMS_CARD_LABEL = 'Prélèvement laboratoire';
export const MULTI_NURSING_ITEMS_CARD_LABEL = 'Soins infirmiers';

export type AppointmentListRow =
  | { kind: 'single'; appointment: Appointment }
  | { kind: 'batch'; appointments: Appointment[]; key: string };

function sortByScheduled(appointments: Appointment[]): Appointment[] {
  return [...appointments].sort(
    (a, b) =>
      new Date(a.scheduled_at || a.created_at || 0).getTime() -
      new Date(b.scheduled_at || b.created_at || 0).getTime(),
  );
}

export function isBloodTestOnlyBatchRow(row: AppointmentListRow): boolean {
  if (row.kind !== 'batch') return false;
  return row.appointments.every((a) => isBloodTestAppointment(a.type));
}

export function isNursingOnlyBatchRow(row: AppointmentListRow): boolean {
  if (row.kind !== 'batch') return false;
  return row.appointments.every((a) => isNursingAppointment(a.type));
}

export function mergeBloodBatchAppointmentsForListDisplay(appointments: Appointment[]): Appointment {
  const sorted = sortByScheduled(appointments);
  const primary = sorted[0];
  const mergedItems: Array<Record<string, unknown>> = [];
  const seen = new Set<string>();
  for (const apt of sorted) {
    const ext = apt as Appointment & {
      blood_test_items?: Array<Record<string, unknown>>;
      blood_test_items_display?: Array<Record<string, unknown>>;
    };
    const raw =
      ext.blood_test_items_display?.length
        ? ext.blood_test_items_display
        : ext.blood_test_items ?? [];
    if (raw.length > 0) {
      for (const it of raw) {
        const label = String(it?.label ?? it?.category_name ?? '').trim();
        const cid = it?.category_id != null ? String(it.category_id) : '';
        const key = `${cid}|${label}`;
        if (!label && !cid) continue;
        if (seen.has(key)) continue;
        seen.add(key);
        mergedItems.push(it);
      }
    } else {
      const label = String(apt.category_name ?? '').trim();
      const cid = apt.category_id != null ? String(apt.category_id) : '';
      const key = `${cid}|${label}`;
      if (!label && !cid) continue;
      if (seen.has(key)) continue;
      seen.add(key);
      mergedItems.push({
        label: label || null,
        category_id: cid || null,
        category_name: apt.category_name ?? null,
      });
    }
  }
  const extPrimary = primary as Appointment & {
    blood_test_items?: unknown;
    blood_test_items_display?: unknown;
  };
  return {
    ...primary,
    blood_test_items: mergedItems.length > 0 ? mergedItems : extPrimary.blood_test_items,
    blood_test_items_display:
      mergedItems.length > 0 ? mergedItems : extPrimary.blood_test_items_display,
  } as Appointment;
}

export function mergeNursingBatchAppointmentsForListDisplay(appointments: Appointment[]): Appointment {
  const sorted = sortByScheduled(appointments);
  const primary = sorted[0];
  const mergedItems: Array<Record<string, unknown>> = [];
  const seen = new Set<string>();
  for (const apt of sorted) {
    const ext = apt as Appointment & {
      nursing_items?: Array<Record<string, unknown>>;
      nursing_items_display?: Array<Record<string, unknown>>;
    };
    const raw = ext.nursing_items_display?.length
      ? ext.nursing_items_display
      : ext.nursing_items ?? [];
    if (raw.length > 0) {
      for (const it of raw) {
        const label = String(it?.label ?? it?.category_name ?? '').trim();
        const cid = it?.category_id != null ? String(it.category_id) : '';
        const key = `${cid}|${label}`;
        if (!label && !cid) continue;
        if (seen.has(key)) continue;
        seen.add(key);
        mergedItems.push(it);
      }
    } else {
      const label = String(apt.category_name ?? '').trim();
      const cid = apt.category_id != null ? String(apt.category_id) : '';
      const key = `${cid}|${label}`;
      if (!label && !cid) continue;
      if (seen.has(key)) continue;
      seen.add(key);
      mergedItems.push({
        label: label || null,
        category_id: cid || null,
        category_name: apt.category_name ?? null,
      });
    }
  }
  const extPrimary = primary as Appointment & {
    nursing_items?: unknown;
    nursing_items_display?: unknown;
  };
  return {
    ...primary,
    nursing_items: mergedItems.length > 0 ? mergedItems : extPrimary.nursing_items,
    nursing_items_display:
      mergedItems.length > 0 ? mergedItems : extPrimary.nursing_items_display,
  } as Appointment;
}

export function groupAppointmentsByBatch(list: Appointment[]): AppointmentListRow[] {
  const out: AppointmentListRow[] = [];
  const seen = new Set<string>();
  for (const a of list) {
    const bid = a.creation_batch_id;
    const ty = a.type;
    const canGroup = isNursingAppointment(ty) || isBloodTestAppointment(ty);
    if (!bid || !canGroup) {
      out.push({ kind: 'single', appointment: a });
      continue;
    }
    const normalizedType = isBloodTestAppointment(ty) ? 'blood_test' : 'nursing';
    const key = `${normalizedType}:${bid}`;
    if (seen.has(key)) continue;
    const group = list.filter(
      (x) =>
        x.creation_batch_id === bid &&
        (normalizedType === 'blood_test'
          ? isBloodTestAppointment(x.type)
          : isNursingAppointment(x.type)),
    );
    if (group.length <= 1) {
      out.push({ kind: 'single', appointment: a });
      continue;
    }
    seen.add(key);
    out.push({ kind: 'batch', appointments: sortByScheduled(group), key });
  }
  return out;
}

function patientRelKey(a: Appointment): string {
  const ext = a as Appointment & { relative_id?: string };
  return `${a.patient_id ?? ''}::${ext.relative_id ?? ''}`;
}

function createdTs(a: Appointment): number {
  return new Date(a.created_at || 0).getTime();
}

function nurseDemandesShouldCluster(a: Appointment, b: Appointment): boolean {
  if (!isNursingAppointment(a.type) || !isNursingAppointment(b.type)) return false;
  const ba = a.creation_batch_id;
  const bb = b.creation_batch_id;
  if (ba && bb && ba === bb) return true;
  if (ba || bb) return false;
  return patientRelKey(a) === patientRelKey(b) && Math.abs(createdTs(a) - createdTs(b)) <= 120_000;
}

/** Demandes infirmier « en attente » — regroupement renforcé (aligné web). */
export function groupAppointmentsForNurseMesDemandes(list: Appointment[]): AppointmentListRow[] {
  const nursing = list.filter((x) => isNursingAppointment(x.type));
  const n = nursing.length;
  const parent = Array.from({ length: n }, (_, i) => i);

  function find(i: number): number {
    if (parent[i] !== i) parent[i] = find(parent[i]);
    return parent[i];
  }
  function union(i: number, j: number) {
    const ri = find(i);
    const rj = find(j);
    if (ri !== rj) parent[ri] = rj;
  }

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (nurseDemandesShouldCluster(nursing[i], nursing[j])) union(i, j);
    }
  }

  const clusterByRoot = new Map<number, Appointment[]>();
  for (let i = 0; i < n; i++) {
    const r = find(i);
    if (!clusterByRoot.has(r)) clusterByRoot.set(r, []);
    clusterByRoot.get(r)!.push(nursing[i]);
  }

  const clusterById = new Map<string, Appointment[]>();
  for (const group of clusterByRoot.values()) {
    const sorted = sortByScheduled(group);
    for (const a of sorted) clusterById.set(a.id, sorted);
  }

  const emitted = new Set<string>();
  const out: AppointmentListRow[] = [];

  for (const a of list) {
    if (emitted.has(a.id)) continue;
    if (!isNursingAppointment(a.type)) {
      out.push({ kind: 'single', appointment: a });
      continue;
    }
    const cluster = clusterById.get(a.id);
    if (!cluster || cluster.length <= 1) {
      out.push({ kind: 'single', appointment: a });
      emitted.add(a.id);
      continue;
    }
    const bid = cluster[0].creation_batch_id;
    const sameBatch = bid && cluster.every((c) => c.creation_batch_id === bid);
    const key = sameBatch
      ? `nursing:${bid}`
      : `nursing:demande-group:${cluster
          .map((c) => c.id)
          .sort()
          .join(',')}`;
    out.push({ kind: 'batch', appointments: cluster, key });
    cluster.forEach((x) => emitted.add(x.id));
  }
  return out;
}

export function batchLotSummaryLabel(appointments: Appointment[]): string {
  const n = appointments.length;
  if (n <= 1) return '';
  const labOnly = appointments.every((a) => isBloodTestAppointment(a.type));
  const nurseOnly = appointments.every((a) => isNursingAppointment(a.type));
  if (labOnly) return `Lot · ${n} prélèvement${n > 1 ? 's' : ''}`;
  if (nurseOnly) return `Lot · ${n} acte${n > 1 ? 's' : ''} infirmier${n > 1 ? 's' : ''}`;
  return `Lot · ${n} rendez-vous`;
}

/** RDV à ouvrir en détail (1er du lot chronologique). */
export function firstBatchAppointmentForDetail(appointments: Appointment[]): Appointment {
  return sortByScheduled(appointments)[0];
}

export function displayAppointmentForListRow(row: AppointmentListRow): Appointment {
  if (row.kind === 'single') return row.appointment;
  if (isBloodTestOnlyBatchRow(row)) {
    return mergeBloodBatchAppointmentsForListDisplay(row.appointments);
  }
  if (isNursingOnlyBatchRow(row)) {
    return mergeNursingBatchAppointmentsForListDisplay(row.appointments);
  }
  return row.appointments[0];
}

export function navigateAppointmentForListRow(row: AppointmentListRow): Appointment {
  if (row.kind === 'single') return row.appointment;
  return firstBatchAppointmentForDetail(row.appointments);
}

/** Aperçu offre pour la modal — données liste (ouverture immédiate avant GET détail). */
export function offerPreviewFromListRow(row: AppointmentListRow): Appointment {
  const primary = navigateAppointmentForListRow(row);
  if (row.kind === 'batch') {
    const siblings = row.appointments.filter((a) => a.id !== primary.id);
    if (siblings.length > 0) {
      return { ...primary, batch_siblings: siblings };
    }
  }
  return primary;
}
