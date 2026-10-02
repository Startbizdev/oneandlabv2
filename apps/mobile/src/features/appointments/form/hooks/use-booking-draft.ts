import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { useBookingDraftStore } from '../../store/booking-draft-store';
import {
  bookingDraftOwnerKey,
  hasBookingDraftContent,
  isBookingDraftExpired,
  type BookingDraftData,
} from '../utils/booking-draft';
import type { useBookingWizard } from './useBookingWizard';

/** Regroupe la frappe au clavier avant d'écrire sur l'appareil. */
const FORM_SAVE_DELAY_MS = 500;

const subscribeHydration = (onChange: () => void) =>
  useBookingDraftStore.persist.onFinishHydration(() => onChange());
const isDraftStoreHydrated = () => useBookingDraftStore.persist.hasHydrated();

export function useBookingDraftOwnerKey(): string | null {
  const id = useAuthStore((s) => s.user?.id);
  const role = useAuthStore((s) => s.user?.role);
  return bookingDraftOwnerKey({ id, role });
}

/**
 * Brouillon laissé lors d'une précédente ouverture du tunnel (moins de 24 h).
 * Ceux écrits pendant cette ouverture ne sont jamais proposés.
 */
export function useBookingDraftResume(ownerKey: string | null, enabled: boolean) {
  const [openedAt] = useState(() => Date.now());
  const [handled, setHandled] = useState(false);
  const [offered, setOffered] = useState(false);
  const hydrated = useSyncExternalStore(subscribeHydration, isDraftStoreHydrated);
  const stored = useBookingDraftStore((s) => (ownerKey ? s.drafts[ownerKey] : undefined));
  const clearDraft = useBookingDraftStore((s) => s.clearDraft);
  const resumable =
    hydrated &&
    !handled &&
    stored &&
    stored.savedAt < openedAt &&
    !isBookingDraftExpired(stored, openedAt) &&
    hasBookingDraftContent(stored.data)
      ? stored.data
      : null;
  /** La sheet native (route racine) retire le focus à l'écran : une fois proposée, elle reste jusqu'au choix. */
  if (enabled && resumable && !offered) setOffered(true);
  const candidate = enabled || offered ? resumable : null;

  const take = useCallback((): BookingDraftData | null => {
    setHandled(true);
    return candidate;
  }, [candidate]);

  const discard = useCallback(() => {
    setHandled(true);
    if (ownerKey) clearDraft(ownerKey);
  }, [clearDraft, ownerKey]);

  const dismiss = useCallback(() => setHandled(true), []);

  return { visible: candidate !== null, take, discard, dismiss };
}

/** Brouillon de l'ouverture en cours : `discard` l'efface et bloque toute écriture ultérieure. */
export function useBookingDraftSession(ownerKey: string | null) {
  const closedRef = useRef(false);
  const clearDraft = useBookingDraftStore((s) => s.clearDraft);

  const discard = useCallback(() => {
    closedRef.current = true;
    if (ownerKey) clearDraft(ownerKey);
  }, [clearDraft, ownerKey]);

  const canSave = useCallback(() => !closedRef.current, []);

  return { ownerKey, discard, canSave };
}

type BookingDraftSession = ReturnType<typeof useBookingDraftSession>;

/** Enregistre la saisie simple du tunnel sur l'appareil dès qu'un soin est choisi. */
export function useBookingDraftAutosave(
  bw: ReturnType<typeof useBookingWizard>,
  session: BookingDraftSession,
) {
  const w = bw.wizard;
  const { form } = w;
  const saveDraft = useBookingDraftStore((s) => s.saveDraft);
  const { ownerKey, canSave } = session;
  const enabled = Boolean(ownerKey) && w.selectedServices.length > 0 && !bw.created;

  const save = useCallback(() => {
    if (!ownerKey || !canSave()) return;
    saveDraft(ownerKey, {
      step: bw.step,
      wizardIndex: bw.wizardIndex,
      selectedServices: w.selectedServices,
      formDataByService: w.formDataByService,
      patient: form.getValues(),
      addressComplement: w.addressComplement,
      selectedPatientId: w.selectedPatientId,
      patientMode: w.patientMode,
      selectedRelativeId: bw.selectedRelativeId,
      labPreferenceMode: bw.labPreferenceMode,
      preferredLabBrandId: bw.preferredLabBrandId,
      nurseAssignmentMode: bw.nurseAssignmentMode,
      proLinkedNurseId: bw.proLinkedNurseId,
      externalNursePhone: bw.externalNursePhone,
    });
  }, [
    ownerKey,
    canSave,
    saveDraft,
    form,
    bw.step,
    bw.wizardIndex,
    bw.selectedRelativeId,
    bw.labPreferenceMode,
    bw.preferredLabBrandId,
    bw.nurseAssignmentMode,
    bw.proLinkedNurseId,
    bw.externalNursePhone,
    w.selectedServices,
    w.formDataByService,
    w.addressComplement,
    w.selectedPatientId,
    w.patientMode,
  ]);

  useEffect(() => {
    if (!enabled) return undefined;
    save();
    let timer: ReturnType<typeof setTimeout> | null = null;
    const subscription = form.watch(() => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        save();
      }, FORM_SAVE_DELAY_MS);
    });
    return () => {
      subscription.unsubscribe();
      if (timer) {
        clearTimeout(timer);
        save();
      }
    };
  }, [enabled, form, save]);
}
