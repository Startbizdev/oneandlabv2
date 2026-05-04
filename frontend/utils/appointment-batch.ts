import { isBloodTestAppointment, isNursingAppointment } from '~/utils/appointment-type-rules';

/**
 * Regroupe les RDV d’un même lot pour les soins infirmiers.
 * Les prises de sang (`blood_test`) ne devraient plus arriver en lot, mais les anciennes lignes
 * non migrées sont regroupées ici comme fallback d’affichage uniquement.
 */

export type AppointmentListRow =
  | { kind: 'single'; appointment: any }
  | { kind: 'batch'; appointments: any[]; key: string };

export function groupAppointmentsByBatch(list: any[]): AppointmentListRow[] {
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
    group.sort((x, y) => {
      const ax = new Date(x.scheduled_at || x.created_at || 0).getTime();
      const bx = new Date(y.scheduled_at || y.created_at || 0).getTime();
      return ax - bx;
    });
    out.push({ kind: 'batch', appointments: group, key });
  }
  return out;
}

/** Clé patient + proche (pour regroupement sans batch_id). */
function patientRelKey(a: any): string {
  return `${a.patient_id ?? ''}::${a.relative_id ?? ''}`;
}

function createdTs(a: any): number {
  return new Date(a.created_at || 0).getTime();
}

function scheduledTs(a: any): number {
  return new Date(a.scheduled_at || a.created_at || 0).getTime();
}

/**
 * Deux demandes soins à regrouper si : même lot (creation_batch_id), ou même patient/proche
 * créés quasi simultanément (sans batch_id fiable des deux côtés).
 */
function nurseDemandesShouldCluster(a: any, b: any): boolean {
  if (!isNursingAppointment(a.type) || !isNursingAppointment(b.type)) return false;
  const ba = a.creation_batch_id;
  const bb = b.creation_batch_id;
  if (ba && bb && ba === bb) return true;
  if (ba || bb) return false;
  if (patientRelKey(a) !== patientRelKey(b)) return false;
  return Math.abs(createdTs(a) - createdTs(b)) <= 120_000;
}

/**
 * Page **Mes demandes** (`/nurse/demandes`) — uniquement des soins infirmiers.
 *
 * Cas principal : un **professionnel** crée **plusieurs RDV soins** pour le **même patient** en une fois
 * (multi-soins) → les lignes partagent le même `creation_batch_id` → **une seule carte** à accepter / refuser.
 *
 * Secours : deux soins sans lot en base mais même patient et créés quasi en même temps (fenêtre 2 min).
 */
export function groupAppointmentsForNurseMesDemandes(list: any[]): AppointmentListRow[] {
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

  const clusterByRoot = new Map<number, any[]>();
  for (let i = 0; i < n; i++) {
    const r = find(i);
    if (!clusterByRoot.has(r)) clusterByRoot.set(r, []);
    clusterByRoot.get(r)!.push(nursing[i]);
  }

  const clusterById = new Map<string, any[]>();
  for (const group of clusterByRoot.values()) {
    const sorted = [...group].sort(
      (a, b) =>
        scheduledTs(a) - scheduledTs(b) || createdTs(a) - createdTs(b) || String(a.id).localeCompare(String(b.id)),
    );
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
    const sameBatch =
      bid && cluster.every((c) => c.creation_batch_id === bid);
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
