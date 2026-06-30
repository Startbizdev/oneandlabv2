import type { Ref } from 'vue';
import { bookingDbg, bookingDbgResetFlow } from '~/utils/booking-celebration-debug';
import { useBookingApiHold } from '~/composables/useBookingApiHold';

/** Durée minimale d’affichage après succès API (laisse le temps de lire au moins une phrase). */
export const BOOKING_CELEBRATION_MIN_MS = 3800;

const DEFAULT_LEAVE_MS = 380;

export type BookingCelebrationResult = { success: boolean };

/**
 * Affiche l’overlay le temps de `fn`, garantit une durée minimale si succès,
 * masque l’overlay puis laisse une courte pause pour la transition CSS avant navigation.
 *
 * Pendant `fn()`, les pollings layout qui respectent `useBookingApiHold` sont suspendus
 * pour limiter les timeouts quand le backend traite une série de POST (mono-worker / file d’attente).
 */
export async function runWithBookingCelebrationOverlay<T extends BookingCelebrationResult>(
  overlayVisible: Ref<boolean>,
  fn: () => Promise<T>,
  options?: { minMs?: number; leaveTransitionMs?: number },
): Promise<T> {
  const minMs = options?.minMs ?? BOOKING_CELEBRATION_MIN_MS;
  const leaveMs = options?.leaveTransitionMs ?? DEFAULT_LEAVE_MS;
  const { acquire, release } = useBookingApiHold();

  bookingDbgResetFlow();
  acquire();
  overlayVisible.value = true;
  const t0 = Date.now();
  bookingDbg('overlay → visible, début fn()');

  try {
    let result: T;
    try {
      result = await fn();
    } finally {
      release();
    }
    const apiMs = Date.now() - t0;
    bookingDbg('fn() terminée', { ms: apiMs, success: result?.success, keys: result != null ? Object.keys(result as object) : [] });

    if (!result.success) {
      bookingDbg('succès API faux → overlay masqué');
      overlayVisible.value = false;
      return result;
    }

    const elapsed = Date.now() - t0;
    const remainder = Math.max(0, minMs - elapsed);
    bookingDbg('attente min overlay', { remainderMs: remainder, minMs });
    if (remainder > 0) {
      await new Promise<void>((resolve) => setTimeout(resolve, remainder));
    }

    overlayVisible.value = false;
    bookingDbg('overlay → masqué, pause transition', { leaveMs });
    await new Promise<void>((resolve) => setTimeout(resolve, leaveMs));
    bookingDbg('overlay terminé, navigation possible');
    return result;
  } catch (e) {
    bookingDbg('exception dans runWithBookingCelebrationOverlay', e);
    overlayVisible.value = false;
    throw e;
  }
}
