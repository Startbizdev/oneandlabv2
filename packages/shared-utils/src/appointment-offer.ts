/**
 * Offre entrante : pending, pas créé par le viewer, et pas une réservation directe chez lui.
 * Réservation QR / fiche publique : assigned_nurse_id = infirmier cible → pas d'acceptation manuelle.
 */
export function isPendingIncomingOffer(
  apt: {
    status?: string;
    created_by?: string | null;
    assigned_nurse_id?: string | null;
    type?: string;
  },
  viewerUserId: string | null | undefined,
): boolean {
  if (apt?.status !== 'pending') return false;
  if (viewerUserId == null || viewerUserId === '') return true;
  const viewer = String(viewerUserId);
  const cid = apt.created_by != null && apt.created_by !== '' ? String(apt.created_by) : '';
  if (!cid) return true;
  if (cid === viewer) return false;

  const type = String(apt.type ?? '').toLowerCase();
  if (type === 'nursing' || type === 'nurse') {
    const assigned =
      apt.assigned_nurse_id != null && apt.assigned_nurse_id !== ''
        ? String(apt.assigned_nurse_id)
        : '';
    if (assigned && assigned === viewer) return false;
  }

  return true;
}

/** Offre masquée temporairement après « Plus tard » ou fermeture de la modal. */
export function isOfferModalSnoozed(
  apt: { offer_modal_snoozed_until?: string | null },
  now: Date = new Date(),
): boolean {
  const raw = apt?.offer_modal_snoozed_until;
  if (raw == null || String(raw).trim() === '') return false;
  const until = new Date(String(raw));
  if (Number.isNaN(until.getTime())) return false;
  return until.getTime() > now.getTime();
}

export { isBloodTestAppointment, isNursingAppointment } from './appointment-type-rules';
import { isBloodTestAppointment, isNursingAppointment } from './appointment-type-rules';

const STAFF_CREATOR_ROLES = ['nurse', 'pro', 'lab', 'subaccount'] as const;

/**
 * Prélèvement créé par un pro (infirmier, pro santé, lab…) encore en attente labo :
 * le créateur peut annuler / reprendre le RDV.
 */
export function staffCanManageOwnPendingBloodTest(
  apt:
    | {
        type?: string | null;
        status?: string | null;
        created_by?: string | null;
        created_by_role?: string | null;
      }
    | null
    | undefined,
  viewerUserId: string | null | undefined,
): boolean {
  if (!apt || viewerUserId == null || viewerUserId === '') return false;
  if (!isBloodTestAppointment(apt.type)) return false;
  if (String(apt.status ?? '') !== 'pending') return false;
  if (String(apt.created_by ?? '') !== String(viewerUserId)) return false;
  const creatorRole = String(apt.created_by_role ?? '');
  return (STAFF_CREATOR_ROLES as readonly string[]).includes(creatorRole);
}

/** Même fenêtre que la carte « Demandes » : lignes sans lot créées quasi ensemble. */
export const INCOMING_OFFER_CLUSTER_WINDOW_MS = 120_000;

export type IncomingOfferClusterSource = {
  id?: string | null;
  type?: string | null;
  creation_batch_id?: string | null;
  patient_id?: string | null;
  relative_id?: string | null;
  created_at?: string | null;
  status?: string | null;
  scheduled_at?: string | null;
  category_name?: string | null;
  batch_siblings?: ReadonlyArray<IncomingOfferSiblingStub | null> | null;
};

export type IncomingOfferSiblingStub = {
  id: string;
  status: string;
  scheduled_at: string;
  category_name?: string | null;
  creation_batch_id?: string | null;
  separate_offer_line?: boolean;
};

export function isSeparateOfferLine(item: object | null | undefined): boolean {
  if (!item || !('separate_offer_line' in item)) return false;
  return item.separate_offer_line === true;
}

/** Clé de lot déjà posée en base (`creation_batch_id` + type). */
export function incomingOfferBatchKey(
  apt: { type?: string | null; creation_batch_id?: string | null } | null | undefined,
): string | null {
  const bid = typeof apt?.creation_batch_id === 'string' ? apt.creation_batch_id.trim() : '';
  if (!bid) return null;
  if (isBloodTestAppointment(apt?.type)) return `blood_test:${bid}`;
  if (isNursingAppointment(apt?.type)) return `nursing:${bid}`;
  return null;
}

function offerCreatedMs(apt: IncomingOfferClusterSource): number | null {
  if (!apt.created_at) return null;
  const time = new Date(apt.created_at).getTime();
  return Number.isFinite(time) ? time : null;
}

function patientRelKey(apt: IncomingOfferClusterSource): string {
  return `${apt.patient_id ?? ''}::${apt.relative_id ?? ''}`;
}

function sameOfferKind(a: IncomingOfferClusterSource, b: IncomingOfferClusterSource): boolean {
  if (isNursingAppointment(a.type) && isNursingAppointment(b.type)) return true;
  return isBloodTestAppointment(a.type) && isBloodTestAppointment(b.type);
}

/** Deux lignes = le même envoi (lot SQL, ou même patient créé dans les 2 minutes sans lot). */
export function offersBelongToSameIncomingLot(
  a: IncomingOfferClusterSource,
  b: IncomingOfferClusterSource,
): boolean {
  const idA = a?.id ? String(a.id) : '';
  const idB = b?.id ? String(b.id) : '';
  if (idA && idA === idB) return true;
  const keyA = incomingOfferBatchKey(a);
  const keyB = incomingOfferBatchKey(b);
  if (keyA && keyB) return keyA === keyB;
  if (keyA || keyB) return false;
  if (!sameOfferKind(a, b)) return false;
  if (patientRelKey(a) !== patientRelKey(b)) return false;
  const timeA = offerCreatedMs(a);
  const timeB = offerCreatedMs(b);
  if (timeA == null || timeB == null) return false;
  return Math.abs(timeA - timeB) <= INCOMING_OFFER_CLUSTER_WINDOW_MS;
}

function sharesBackendBatch(
  a: IncomingOfferClusterSource,
  b: IncomingOfferClusterSource,
): boolean {
  const keyA = incomingOfferBatchKey(a);
  const keyB = incomingOfferBatchKey(b);
  return Boolean(keyA && keyA === keyB);
}

function stubFromSibling(
  raw: IncomingOfferSiblingStub,
): IncomingOfferSiblingStub {
  return {
    id: String(raw.id),
    status: String(raw.status ?? 'pending'),
    scheduled_at: String(raw.scheduled_at ?? ''),
    category_name: raw.category_name ?? null,
    creation_batch_id: raw.creation_batch_id ?? null,
    separate_offer_line: raw.separate_offer_line === true,
  };
}

function stubFromAppointment(
  opened: IncomingOfferClusterSource,
  extra: IncomingOfferClusterSource,
): IncomingOfferSiblingStub {
  return {
    id: String(extra.id),
    status: String(extra.status ?? 'pending'),
    scheduled_at: String(extra.scheduled_at ?? ''),
    category_name: extra.category_name ?? null,
    creation_batch_id: extra.creation_batch_id ?? null,
    separate_offer_line: !sharesBackendBatch(opened, extra),
  };
}

function putSibling(
  byId: Map<string, IncomingOfferSiblingStub>,
  openedId: string,
  stub: IncomingOfferSiblingStub,
) {
  if (!stub.id || stub.id === openedId) return;
  const prev = byId.get(stub.id);
  if (!prev) {
    byId.set(stub.id, stub);
    return;
  }
  byId.set(stub.id, {
    id: stub.id,
    status: stub.status || prev.status,
    scheduled_at: stub.scheduled_at || prev.scheduled_at,
    category_name: stub.category_name ?? prev.category_name ?? null,
    creation_batch_id: stub.creation_batch_id || prev.creation_batch_id || null,
    separate_offer_line: stub.separate_offer_line === true || prev.separate_offer_line === true,
  });
}

/** Ajoute les autres lignes du même envoi sur le RDV affiché, sans doublon. */
export function mergeOfferBatchSiblings<T extends IncomingOfferClusterSource>(
  opened: T,
  extras: readonly IncomingOfferClusterSource[],
): T {
  const openedId = opened?.id ? String(opened.id) : '';
  const byId = new Map<string, IncomingOfferSiblingStub>();
  for (const sibling of opened.batch_siblings ?? []) {
    if (sibling?.id) putSibling(byId, openedId, stubFromSibling(sibling));
  }
  for (const extra of extras) {
    if (extra?.id && String(extra.id) !== openedId) {
      putSibling(byId, openedId, stubFromAppointment(opened, extra));
    }
    for (const sibling of extra?.batch_siblings ?? []) {
      if (sibling?.id) putSibling(byId, openedId, stubFromSibling(sibling));
    }
  }
  return { ...opened, batch_siblings: [...byId.values()] };
}

function clusterGroups<T extends IncomingOfferClusterSource>(items: readonly T[]): T[][] {
  const indexed = items.filter((item) => item?.id);
  const parent = indexed.map((_, index) => index);
  const find = (index: number): number => {
    if (parent[index] !== index) parent[index] = find(parent[index]);
    return parent[index];
  };
  const union = (left: number, right: number) => {
    const rootLeft = find(left);
    const rootRight = find(right);
    if (rootLeft !== rootRight) parent[rootLeft] = rootRight;
  };
  for (let i = 0; i < indexed.length; i += 1) {
    for (let j = i + 1; j < indexed.length; j += 1) {
      if (offersBelongToSameIncomingLot(indexed[i], indexed[j])) union(i, j);
    }
  }
  const groups = new Map<number, T[]>();
  for (let i = 0; i < indexed.length; i += 1) {
    const root = find(i);
    const group = groups.get(root) ?? [];
    group.push(indexed[i]);
    groups.set(root, group);
  }
  return [...groups.values()];
}

/**
 * Une entrée de file par envoi. Les autres identifiants du lot sont couverts
 * pour ne plus rouvrir la fenêtre.
 */
export function planIncomingOfferEnqueue<T extends IncomingOfferClusterSource>(
  incoming: readonly T[],
  alreadyCovered: readonly IncomingOfferClusterSource[],
): { enqueue: T[]; coveredIds: string[] } {
  const alreadyIds = new Set(
    alreadyCovered.map((item) => (item?.id ? String(item.id) : '')).filter(Boolean),
  );
  const seen = new Set<string>();
  const fresh: T[] = [];
  const coveredIds: string[] = [];
  for (const item of incoming) {
    const id = item?.id ? String(item.id) : '';
    if (!id || seen.has(id)) continue;
    seen.add(id);
    if (alreadyIds.has(id)) {
      coveredIds.push(id);
      continue;
    }
    fresh.push(item);
  }
  const known = alreadyCovered.filter((item) => item?.id && alreadyIds.has(String(item.id)));
  const enqueue: T[] = [];
  for (const group of clusterGroups([...known, ...fresh])) {
    const newcomers = group.filter((item) => !alreadyIds.has(String(item.id))) as T[];
    if (newcomers.length === 0) continue;
    if (group.some((item) => alreadyIds.has(String(item.id)))) {
      for (const item of newcomers) coveredIds.push(String(item.id));
      continue;
    }
    const [first, ...rest] = newcomers;
    coveredIds.push(...rest.map((item) => String(item.id)));
    enqueue.push(mergeOfferBatchSiblings(first, rest));
  }
  return { enqueue, coveredIds };
}

/** Identifiants à retirer de la file quand une ligne de l'envoi est affichée. */
export function incomingOfferIdsCoveredByOpen(
  opened: IncomingOfferClusterSource,
  queued: readonly IncomingOfferClusterSource[],
): string[] {
  const ids = new Set<string>();
  if (opened?.id) ids.add(String(opened.id));
  for (const sibling of opened.batch_siblings ?? []) {
    if (sibling?.id) ids.add(String(sibling.id));
  }
  const openedId = opened?.id ? String(opened.id) : '';
  for (const group of clusterGroups([opened, ...queued])) {
    if (!openedId || !group.some((item) => String(item.id) === openedId)) continue;
    for (const item of group) {
      if (item.id) ids.add(String(item.id));
      for (const sibling of item.batch_siblings ?? []) {
        if (sibling?.id) ids.add(String(sibling.id));
      }
    }
  }
  return [...ids];
}
