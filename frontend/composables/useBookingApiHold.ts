/**
 * Pendant une création de RDV (overlay « booking celebration »), on suspend les pollings
 * (notifications, listes, pending…) pour éviter de saturer un backend mono-worker et des timeouts fantômes.
 */
export function useBookingApiHold() {
  const holdCount = useState<number>('booking.apiHold', () => 0);

  function acquire() {
    holdCount.value += 1;
  }

  function release() {
    holdCount.value = Math.max(0, holdCount.value - 1);
  }

  /** Ref réactif : > 0 ⇒ les pollings doivent skip leur tick. */
  const isHeld = computed(() => holdCount.value > 0);

  return {
    holdCount: readonly(holdCount),
    acquire,
    release,
    isHeld,
  };
}
