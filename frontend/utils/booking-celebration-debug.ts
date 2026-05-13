/** Origine `performance.now()` pour les deltas « depuis début overlay » (temps réel console). */
let bookingDbgFlowOriginMs = 0;

/** À appeler au début de `runWithBookingCelebrationOverlay` pour remettre les +XXms à zéro. */
export function bookingDbgResetFlow(): void {
  if (import.meta.dev && typeof performance !== 'undefined') {
    bookingDbgFlowOriginMs = performance.now();
  }
}

function bookingDbgWallClock(): string {
  const d = new Date();
  const p = (n: number, l = 2) => String(n).padStart(l, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`;
}

function bookingDbgDelta(): string {
  if (typeof performance === 'undefined' || bookingDbgFlowOriginMs <= 0) return '';
  return ` Δ${(performance.now() - bookingDbgFlowOriginMs).toFixed(0)}ms`;
}

/** Logs réservés au debug du flux « prise de RDV » (uniquement en dev), horodatés pour lecture en temps réel. */
export function bookingDbg(...args: unknown[]) {
  if (import.meta.dev) {
    const live = `[live ${bookingDbgWallClock()}${bookingDbgDelta()}]`;
    console.info('[booking-celebration]', live, ...args);
  }
}

/** Une entrée par soin sélectionné (même icône répétée = rotation visible entre les indices). */
export function celebrationRotateIconsFromServices(
  services: ReadonlyArray<{ type: string; icon?: string | null }>,
): string[] {
  const row = (s: { type: string; icon?: string | null }) => {
    const raw = s.icon != null && String(s.icon).trim() !== '' ? String(s.icon).trim() : '';
    const fallback = String(s.type || '') === 'blood_test' ? 'i-lucide-droplet' : 'i-lucide-heart-pulse';
    return raw || fallback;
  };
  if (services.length === 0) return ['i-lucide-heart-pulse', 'i-lucide-droplet'];
  return services.map(row);
}
