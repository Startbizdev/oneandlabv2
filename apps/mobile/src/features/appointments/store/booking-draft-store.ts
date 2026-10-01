import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  pruneBookingDrafts,
  sanitizeDraftFormDataByService,
  type BookingDraft,
  type BookingDraftData,
} from '../form/utils/booking-draft';

export const BOOKING_DRAFT_STORAGE_KEY = '@oneandlab/booking-drafts';

interface BookingDraftState {
  /** Indexé par `bookingDraftOwnerKey` (rôle + id utilisateur). */
  drafts: Record<string, BookingDraft>;
  saveDraft: (ownerKey: string, data: BookingDraftData) => void;
  clearDraft: (ownerKey: string) => void;
  clearAll: () => void;
}

/** Brouillons de création de RDV conservés sur l'appareil uniquement (aucun endpoint de reprise côté API). */
export const useBookingDraftStore = create<BookingDraftState>()(
  persist(
    (set) => ({
      drafts: {},
      saveDraft: (ownerKey, data) =>
        set((state) => ({
          drafts: {
            ...pruneBookingDrafts(state.drafts),
            [ownerKey]: {
              savedAt: Date.now(),
              data: { ...data, formDataByService: sanitizeDraftFormDataByService(data.formDataByService) },
            },
          },
        })),
      clearDraft: (ownerKey) =>
        set((state) => {
          if (!state.drafts[ownerKey]) return state;
          const next = { ...state.drafts };
          delete next[ownerKey];
          return { drafts: next };
        }),
      clearAll: () => set({ drafts: {} }),
    }),
    {
      name: BOOKING_DRAFT_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ drafts: state.drafts }),
      merge: (persisted, current) => ({
        ...current,
        drafts: {
          ...pruneBookingDrafts(
            typeof persisted === 'object' && persisted !== null && 'drafts' in persisted
              ? persisted.drafts
              : undefined,
          ),
          ...current.drafts,
        },
      }),
    },
  ),
);
