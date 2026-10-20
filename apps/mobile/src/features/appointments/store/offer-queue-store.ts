import { create } from 'zustand';
import type { Appointment } from '@oneandlab/shared-types';
import {
  incomingOfferBatchKey,
  incomingOfferIdsCoveredByOpen,
  mergeOfferBatchSiblings,
  planIncomingOfferEnqueue,
  isPendingIncomingOffer,
  isBloodTestAppointment,
  isOfferModalSnoozed,
  type IncomingOfferClusterSource,
} from '@oneandlab/shared-utils';
import {
  offerOpenFailureFromError,
  type OpenIncomingOfferFailure,
} from '@/lib/errors/offer-open-failure';
import { useSheetStore } from '@/components/ui/sheet/sheet-store';
import { fetchAppointment } from '../api/appointments.service';

export type OpenIncomingOfferResult = { ok: true } | { ok: false; reason: OpenIncomingOfferFailure };

function offerSnapshot(apt: Appointment | IncomingOfferClusterSource): IncomingOfferClusterSource {
  return {
    id: apt.id ? String(apt.id) : '',
    type: apt.type ?? null,
    creation_batch_id: apt.creation_batch_id ?? null,
    patient_id: apt.patient_id ?? null,
    relative_id: apt.relative_id ?? null,
    created_at: apt.created_at ?? null,
    status: apt.status ?? null,
    scheduled_at: apt.scheduled_at ?? null,
    category_name: 'category_name' in apt ? (apt.category_name ?? null) : null,
    batch_siblings: (apt.batch_siblings ?? []).flatMap((sibling) => {
      if (!sibling?.id) return [];
      return [{
        id: String(sibling.id),
        status: String(sibling.status ?? ''),
        scheduled_at: String(sibling.scheduled_at ?? ''),
      }];
    }),
  };
}

function canOpenOffer(data: Appointment, role: string, userId: string): boolean {
  if (!data?.id) return false;
  if (['canceled', 'cancelled', 'refused', 'expired'].includes(String(data.status ?? ''))) {
    return false;
  }
  if (role === 'nurse' && isBloodTestAppointment(data.type)) return false;
  if (isOfferModalSnoozed(data)) return false;
  if (!isPendingIncomingOffer(data, userId)) return false;
  if (role === 'nurse') {
    const assigned = data.assigned_nurse_id;
    if (assigned && String(assigned) !== String(userId)) return false;
  }
  return true;
}

const COVERED_SNAPSHOT_LIMIT = 300;

function rememberOpened(
  state: Pick<OfferQueueState, 'queue' | 'displayedIds' | 'displayedBatchKeys' | 'coveredSnapshots' | 'selected'>,
  data: Appointment,
) {
  const sameLotIds = new Set(incomingOfferIdsCoveredByOpen(data, state.queue));
  const extras: Array<Appointment | IncomingOfferClusterSource> = state.queue.filter(
    (item) => item.id !== data.id && sameLotIds.has(item.id),
  );
  if (state.selected && state.selected.id === data.id) extras.push(state.selected);
  const merged = mergeOfferBatchSiblings(data, extras);
  const dropIds = new Set(incomingOfferIdsCoveredByOpen(merged, state.queue));
  const ids = new Set(state.displayedIds);
  for (const id of dropIds) ids.add(id);
  const batchKey = incomingOfferBatchKey(merged);
  const displayedBatchKeys = new Set(state.displayedBatchKeys);
  if (batchKey) displayedBatchKeys.add(batchKey);
  const queue = state.queue.filter((item) => {
    if (dropIds.has(item.id)) return false;
    const key = incomingOfferBatchKey(item);
    return !batchKey || key !== batchKey;
  });
  const coveredSnapshots = [...state.coveredSnapshots];
  for (const snapshot of [offerSnapshot(merged), ...state.queue.filter((item) => dropIds.has(item.id)).map(offerSnapshot)]) {
    if (!snapshot.id) continue;
    const index = coveredSnapshots.findIndex((item) => String(item.id) === String(snapshot.id));
    if (index >= 0) coveredSnapshots[index] = snapshot;
    else coveredSnapshots.push(snapshot);
  }
  return {
    queue,
    displayedIds: ids,
    displayedBatchKeys,
    coveredSnapshots: coveredSnapshots.slice(-COVERED_SNAPSHOT_LIMIT),
    selected: merged,
  };
}

interface OfferQueueState {
  queue: Appointment[];
  displayedIds: Set<string>;
  displayedBatchKeys: Set<string>;
  coveredSnapshots: IncomingOfferClusterSource[];
  visible: boolean;
  /** Offre prête mais une sheet est ouverte : présentée dès qu'elles sont toutes fermées. */
  awaitingSheet: boolean;
  selected: Appointment | null;
  shareToken: string | null;
  enqueueMany: (items: Appointment[]) => void;
  processNext: (role: string, userId: string) => Promise<void>;
  openIncomingOffer: (
    appointmentId: string,
    role: string,
    userId: string,
    preview?: Appointment | null,
  ) => Promise<OpenIncomingOfferResult>;
  closeModal: () => void;
  setShareToken: (token: string | null) => void;
  reset: () => void;
}

let processNextInFlight: Promise<void> | null = null;
let stopWaitingForSheets: (() => void) | null = null;

function hasOpenSheet(): boolean {
  return Object.keys(useSheetStore.getState().entries).length > 0;
}

function cancelWaitForSheets() {
  stopWaitingForSheets?.();
  stopWaitingForSheets = null;
}

/** Une seule formSheet à la fois : l'offre attend la fermeture des sheets ouvertes (dont la sienne). */
function presentOffer(marked: Partial<OfferQueueState>) {
  const store = useOfferQueueStore;
  if (store.getState().visible) {
    store.setState(marked);
    return;
  }
  if (!hasOpenSheet()) {
    cancelWaitForSheets();
    store.setState({ ...marked, visible: true, awaitingSheet: false });
    return;
  }
  store.setState({ ...marked, awaitingSheet: true });
  if (stopWaitingForSheets) return;
  stopWaitingForSheets = useSheetStore.subscribe((sheets) => {
    if (Object.keys(sheets.entries).length > 0) return;
    cancelWaitForSheets();
    const current = store.getState();
    if (!current.awaitingSheet) return;
    store.setState({ visible: Boolean(current.selected), awaitingSheet: false });
  });
}

function hideOffer(marked?: Partial<OfferQueueState>) {
  cancelWaitForSheets();
  useOfferQueueStore.setState({ ...marked, visible: false, awaitingSheet: false, selected: null });
}

export const useOfferQueueStore = create<OfferQueueState>((set, get) => ({
  queue: [],
  displayedIds: new Set(),
  displayedBatchKeys: new Set(),
  coveredSnapshots: [],
  visible: false,
  awaitingSheet: false,
  selected: null,
  shareToken: null,

  setShareToken: (token) => set({ shareToken: token }),

  enqueueMany: (items) => {
    const state = get();
    const displayedId = (state.visible || state.awaitingSheet) && state.selected?.id ? state.selected.id : '';
    const candidates = items.filter((item) => item?.id && item.id !== displayedId);
    const already = [
      ...state.coveredSnapshots,
      ...[...state.displayedIds].map((id) => ({ id })),
      ...state.queue.map(offerSnapshot),
    ];
    const plan = planIncomingOfferEnqueue(candidates, already);
    if (plan.enqueue.length === 0 && plan.coveredIds.length === 0) return;

    const displayedIds = new Set(state.displayedIds);
    for (const id of plan.coveredIds) displayedIds.add(id);
    for (const item of plan.enqueue) displayedIds.add(item.id);
    const displayedBatchKeys = new Set(state.displayedBatchKeys);
    for (const item of [...plan.enqueue, ...candidates]) {
      const key = incomingOfferBatchKey(item);
      if (key) displayedBatchKeys.add(key);
    }
    const coveredSnapshots = [...state.coveredSnapshots];
    const stored = [
      ...plan.enqueue.map(offerSnapshot),
      ...candidates.filter((item) => plan.coveredIds.includes(item.id)).map(offerSnapshot),
    ];
    for (const snapshot of stored) {
      if (!snapshot.id) continue;
      const index = coveredSnapshots.findIndex((item) => String(item.id) === String(snapshot.id));
      if (index >= 0) coveredSnapshots[index] = snapshot;
      else coveredSnapshots.push(snapshot);
    }
    set({
      queue: [...state.queue, ...plan.enqueue],
      displayedIds,
      displayedBatchKeys,
      coveredSnapshots: coveredSnapshots.slice(-COVERED_SNAPSHOT_LIMIT),
    });
  },

  processNext: (role, userId) => {
    if (processNextInFlight) return processNextInFlight;
    processNextInFlight = (async () => {
    for (let guard = 0; guard < 50; guard += 1) {
      const state = get();
      if (state.visible || state.awaitingSheet || state.queue.length === 0 || !role || !userId) return;

      const next = state.queue[0];
      if (!next?.id) {
        set({ queue: state.queue.slice(1) });
        continue;
      }

      try {
        const res = await fetchAppointment(next.id, { includeBatch: true });
        if (!res.success || !res.data) {
          const current = get();
          const displayedIds = new Set(current.displayedIds);
          const head = current.queue[0];
          if (head?.id) displayedIds.add(head.id);
          set({ queue: current.queue.slice(1), displayedIds });
          continue;
        }
        const data = res.data;
        if (!canOpenOffer(data, role, userId)) {
          hideOffer(rememberOpened(get(), data));
          continue;
        }
        presentOffer(rememberOpened(get(), data));
        return;
      } catch {
        const current = get();
        const displayedIds = new Set(current.displayedIds);
        const head = current.queue[0];
        if (head?.id) displayedIds.add(head.id);
        set({ queue: current.queue.slice(1), displayedIds });
      }
    }
    })().finally(() => {
      processNextInFlight = null;
    });
    return processNextInFlight;
  },

  openIncomingOffer: async (appointmentId, role, userId, preview) => {
    if (!appointmentId || !role || !userId) {
      return { ok: false, reason: 'invalid' };
    }

    const previewData =
      preview && preview.id === appointmentId && canOpenOffer(preview, role, userId)
        ? preview
        : null;

    if (previewData) presentOffer(rememberOpened(get(), previewData));

    try {
      const res = await fetchAppointment(appointmentId, { includeBatch: true });
      if (res.success && (res as { alreadyAccepted?: boolean }).alreadyAccepted) {
        hideOffer();
        return { ok: false, reason: 'already_accepted' };
      }
      if (res.success && (res as { appointmentUnavailable?: boolean }).appointmentUnavailable) {
        hideOffer();
        return { ok: false, reason: 'unavailable' };
      }
      if (!res.success || !res.data) {
        if (previewData) return { ok: true };
        return { ok: false, reason: 'unavailable' };
      }
      const data = res.data;

      if (!canOpenOffer(data, role, userId)) {
        hideOffer(rememberOpened(get(), data));
        return { ok: false, reason: 'unavailable' };
      }

      presentOffer(rememberOpened(get(), data));
      return { ok: true };
    } catch (error) {
      const reason = offerOpenFailureFromError(error);
      if (previewData && (reason === 'network' || reason === 'error')) return { ok: true };
      if (reason === 'error') console.warn('[offer-queue] ouverture de l’offre impossible', error);
      hideOffer();
      return { ok: false, reason };
    }
  },

  closeModal: () => hideOffer(),

  reset: () => {
    cancelWaitForSheets();
    set({
      queue: [],
      displayedIds: new Set(),
      displayedBatchKeys: new Set(),
      coveredSnapshots: [],
      visible: false,
      awaitingSheet: false,
      selected: null,
      shareToken: null,
    });
  },
}));
