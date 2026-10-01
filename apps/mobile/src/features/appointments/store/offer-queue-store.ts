import { create } from 'zustand';
import type { Appointment } from '@oneandlab/shared-types';
import { isPendingIncomingOffer, isBloodTestAppointment, isNursingAppointment, isOfferModalSnoozed } from '@oneandlab/shared-utils';
import { fetchAppointment } from '../api/appointments.service';

export type OpenIncomingOfferResult =
  | { ok: true }
  | { ok: false; reason: 'invalid' | 'unavailable' | 'already_accepted' | 'network' };

function batchKey(apt: Appointment): string | null {
  const bid = apt.creation_batch_id;
  if (!bid) return null;
  if (isBloodTestAppointment(apt.type)) return `blood_test:${bid}`;
  if (isNursingAppointment(apt.type)) return `nursing:${bid}`;
  return null;
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

function markDisplayedAndFilterQueue(
  state: Pick<OfferQueueState, 'queue' | 'displayedIds' | 'displayedBatchKeys'>,
  data: Appointment,
) {
  const ids = new Set(state.displayedIds);
  ids.add(data.id);
  const bk = batchKey(data);
  const batchKeys = new Set(state.displayedBatchKeys);
  if (bk) batchKeys.add(bk);
  const queue = bk
    ? state.queue.filter((a) => batchKey(a) !== bk)
    : state.queue.filter((a) => a.id !== data.id);
  return { queue, displayedIds: ids, displayedBatchKeys: batchKeys };
}

interface OfferQueueState {
  queue: Appointment[];
  displayedIds: Set<string>;
  displayedBatchKeys: Set<string>;
  visible: boolean;
  selected: Appointment | null;
  shareToken: string | null;
  /** Force Gorhom à re-présenter la sheet à chaque ouverture manuelle. */
  presentNonce: number;
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

export const useOfferQueueStore = create<OfferQueueState>((set, get) => ({
  queue: [],
  displayedIds: new Set(),
  displayedBatchKeys: new Set(),
  visible: false,
  selected: null,
  shareToken: null,
  presentNonce: 0,

  setShareToken: (token) => set({ shareToken: token }),

  enqueueMany: (items) => {
    const state = get();
    const ids = new Set(state.displayedIds);
    const batchKeys = new Set(state.displayedBatchKeys);
    const toAdd: Appointment[] = [];
    const localBatch = new Set<string>();

    for (const a of items) {
      if (!a?.id || ids.has(a.id)) continue;
      const bk = batchKey(a);
      if (bk && (batchKeys.has(bk) || localBatch.has(bk))) continue;
      if (bk) localBatch.add(bk);
      ids.add(a.id);
      toAdd.push(a);
    }

    if (toAdd.length === 0) return;
    const newBatchKeys = new Set([...batchKeys, ...toAdd.map(batchKey).filter(Boolean) as string[]]);
    set({
      queue: [...state.queue, ...toAdd],
      displayedIds: ids,
      displayedBatchKeys: newBatchKeys,
    });
  },

  processNext: async (role, userId) => {
    const state = get();
    if (state.visible || state.queue.length === 0 || !role || !userId) return;

    const next = state.queue[0];
    if (!next?.id) {
      set({ queue: state.queue.slice(1) });
      return;
    }

    try {
      const res = await fetchAppointment(next.id, { includeBatch: true });
      if (!res.success || !res.data) {
        if (res.success && (res as { alreadyAccepted?: boolean }).alreadyAccepted) {
          set({ queue: state.queue.slice(1) });
          return;
        }
        if (res.success && (res as { appointmentUnavailable?: boolean }).appointmentUnavailable) {
          set({ queue: state.queue.slice(1) });
          return;
        }
        set({ queue: state.queue.slice(1) });
        return;
      }
      const data = res.data;

      if (!canOpenOffer(data, role, userId)) {
        set({ queue: state.queue.slice(1) });
        return;
      }

      const marked = markDisplayedAndFilterQueue(get(), data);
      set({
        ...marked,
        selected: data,
        visible: true,
        presentNonce: get().presentNonce + 1,
      });
    } catch {
      set({ queue: state.queue.slice(1) });
    }
  },

  openIncomingOffer: async (appointmentId, role, userId, preview) => {
    if (!appointmentId || !role || !userId) {
      return { ok: false, reason: 'invalid' };
    }

    const previewData =
      preview && preview.id === appointmentId && canOpenOffer(preview, role, userId)
        ? preview
        : null;

    if (previewData) {
      const marked = markDisplayedAndFilterQueue(get(), previewData);
      set({
        ...marked,
        selected: previewData,
        visible: true,
        presentNonce: get().presentNonce + 1,
      });
    }

    try {
      const res = await fetchAppointment(appointmentId, { includeBatch: true });
      if (res.success && (res as { alreadyAccepted?: boolean }).alreadyAccepted) {
        set({ visible: false, selected: null });
        return { ok: false, reason: 'already_accepted' };
      }
      if (res.success && (res as { appointmentUnavailable?: boolean }).appointmentUnavailable) {
        set({ visible: false, selected: null });
        return { ok: false, reason: 'unavailable' };
      }
      if (!res.success || !res.data) {
        if (previewData) return { ok: true };
        return { ok: false, reason: 'unavailable' };
      }
      const data = res.data;

      if (!canOpenOffer(data, role, userId)) {
        set({ visible: false, selected: null });
        return { ok: false, reason: 'unavailable' };
      }

      const marked = markDisplayedAndFilterQueue(get(), data);
      set({
        ...marked,
        selected: data,
        visible: true,
        presentNonce: previewData ? get().presentNonce : get().presentNonce + 1,
      });
      return { ok: true };
    } catch {
      if (previewData) return { ok: true };
      set({ visible: false, selected: null });
      return { ok: false, reason: 'network' };
    }
  },

  closeModal: () => {
    set({ visible: false, selected: null });
  },

  reset: () => {
    set({
      queue: [],
      displayedIds: new Set(),
      displayedBatchKeys: new Set(),
      visible: false,
      selected: null,
      shareToken: null,
      presentNonce: 0,
    });
  },
}));
