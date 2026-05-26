import { create } from 'zustand';
import type { Appointment } from '@oneandlab/shared-types';
import { isPendingIncomingOffer, isBloodTestAppointment, isNursingAppointment } from '@oneandlab/shared-utils';
import { fetchAppointment } from '../api/appointments.service';

function batchKey(apt: Appointment): string | null {
  const bid = apt.creation_batch_id;
  if (!bid) return null;
  if (isBloodTestAppointment(apt.type)) return `blood_test:${bid}`;
  if (isNursingAppointment(apt.type)) return `nursing:${bid}`;
  return null;
}

interface OfferQueueState {
  queue: Appointment[];
  displayedIds: Set<string>;
  displayedBatchKeys: Set<string>;
  visible: boolean;
  selected: Appointment | null;
  shareToken: string | null;
  enqueueMany: (items: Appointment[]) => void;
  processNext: (role: string, userId: string) => Promise<void>;
  /** Ouvre la modal pour une offre (liste Mes demandes — pas la fiche détail). */
  openIncomingOffer: (appointmentId: string, role: string, userId: string) => Promise<void>;
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
      const res = await fetchAppointment(next.id);
      if (!res.success || !res.data) {
        set({ queue: state.queue.slice(1) });
        return;
      }
      const data = res.data;

      if (['canceled', 'cancelled', 'refused', 'expired'].includes(data.status)) {
        set({ queue: state.queue.slice(1) });
        return;
      }

      if (role === 'nurse' && isBloodTestAppointment(data.type)) {
        set({ queue: state.queue.slice(1) });
        return;
      }

      if (!isPendingIncomingOffer(data, userId)) {
        set({ queue: state.queue.slice(1) });
        return;
      }

      const rest = state.queue.slice(1);
      const bk = batchKey(data);
      const filtered = bk
        ? rest.filter((a) => batchKey(a) !== bk)
        : rest;

      set({
        queue: filtered,
        selected: data,
        visible: true,
      });
    } catch {
      set({ queue: state.queue.slice(1) });
    }
  },

  openIncomingOffer: async (appointmentId, role, userId) => {
    if (!appointmentId || !role || !userId) return;
    try {
      const res = await fetchAppointment(appointmentId);
      if (!res.success || !res.data) return;
      const data = res.data;

      if (['canceled', 'cancelled', 'refused', 'expired'].includes(data.status)) return;
      if (role === 'nurse' && isBloodTestAppointment(data.type)) return;
      if (!isPendingIncomingOffer(data, userId)) return;

      const state = get();
      const ids = new Set(state.displayedIds);
      ids.add(data.id);
      const bk = batchKey(data);
      const batchKeys = new Set(state.displayedBatchKeys);
      if (bk) batchKeys.add(bk);

      // Retirer de la file FIFO pour éviter processNext → même offre en double après fermeture.
      const queue = bk
        ? state.queue.filter((a) => batchKey(a) !== bk)
        : state.queue.filter((a) => a.id !== data.id);

      set({
        queue,
        displayedIds: ids,
        displayedBatchKeys: batchKeys,
        selected: data,
        visible: true,
      });
    } catch {
      /* ignore */
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
    });
  },
}));
