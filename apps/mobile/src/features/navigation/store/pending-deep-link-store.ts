import type { Href } from 'expo-router';
import { create } from 'zustand';

/** Après la relance, les redirections « accueil » de fin de connexion (biométrie, inscription) s'effacent. */
const RESUME_GRACE_MS = 15_000;

/**
 * Lien universel ouvert sans session (QR pharmacie, fiche pharmacie) : rejoué après la connexion ou
 * l'inscription au lieu de l'accueil. En mémoire : un redémarrage de l'app l'oublie.
 */
type PendingDeepLinkState = {
  href: Href | null;
  resumedAt: number | null;
  remember: (href: Href) => void;
  /** Lit et efface : un lien n'est rejoué qu'une fois. */
  take: (now?: number) => Href | null;
  /** Un lien vient d'être rejoué : ne pas l'écraser par l'accueil du rôle. */
  wasJustResumed: (now?: number) => boolean;
  /** Session fermée : la prochaine connexion repart de zéro. */
  clearResume: () => void;
  reset: () => void;
};

export const usePendingDeepLinkStore = create<PendingDeepLinkState>((set, get) => ({
  href: null,
  resumedAt: null,
  remember: (href) => set({ href, resumedAt: null }),
  take: (now = Date.now()) => {
    const { href } = get();
    if (href) set({ href: null, resumedAt: now });
    return href;
  },
  wasJustResumed: (now = Date.now()) => {
    const { resumedAt } = get();
    return resumedAt != null && now - resumedAt < RESUME_GRACE_MS;
  },
  clearResume: () => set({ resumedAt: null }),
  reset: () => set({ href: null, resumedAt: null }),
}));

/** Route de relance : le dispatcher refait son travail une fois connecté. */
export function qrLinkHref(token: string): Href {
  return `/qr/${encodeURIComponent(token)}` as Href;
}

export function pharmacyLinkHref(pharmacyId: string, utmQr: string | null): Href {
  const query = utmQr ? `?utm_qr=${encodeURIComponent(utmQr)}` : '';
  return `/pharmacie/${encodeURIComponent(pharmacyId)}${query}` as Href;
}

export function sharedRdvLinkHref(token: string): Href {
  return `/p/rdv/${encodeURIComponent(token)}` as Href;
}
