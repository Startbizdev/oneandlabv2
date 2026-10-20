import { replaceWithPostLoginRoute } from '@/features/auth/hooks/use-auth-guard';
import { pharmacyLinkHref, qrLinkHref, usePendingDeepLinkStore } from '../pending-deep-link-store';

beforeEach(() => usePendingDeepLinkStore.getState().reset());

describe('pending deep link', () => {
  it('construit les routes de relance encodées', () => {
    expect(qrLinkHref('a b')).toBe('/qr/a%20b');
    expect(pharmacyLinkHref('ph-1', 'tok&x')).toBe('/pharmacie/ph-1?utm_qr=tok%26x');
    expect(pharmacyLinkHref('ph-1', null)).toBe('/pharmacie/ph-1');
  });

  it('rejoue le lien une seule fois après la connexion', () => {
    const replace = jest.fn();
    usePendingDeepLinkStore.getState().remember(qrLinkHref('tok'));

    replaceWithPostLoginRoute({ replace }, 'patient');
    expect(replace).toHaveBeenLastCalledWith('/qr/tok');

    // Redirection d'accueil tardive (biométrie, fin d'inscription) : ignorée juste après la relance.
    replaceWithPostLoginRoute({ replace }, 'patient');
    expect(replace).toHaveBeenCalledTimes(1);
  });

  it('ouvre l’accueil du rôle sans lien en attente', () => {
    const replace = jest.fn();
    replaceWithPostLoginRoute({ replace }, 'nurse');
    expect(replace).toHaveBeenCalledWith('/(nurse)/(tabs)/appointments');
  });

  it('la fenêtre de relance expire et se vide à la déconnexion', () => {
    const store = usePendingDeepLinkStore.getState();
    store.remember(pharmacyLinkHref('ph-1', null));
    store.take(1_000);
    expect(store.wasJustResumed(2_000)).toBe(true);
    expect(store.wasJustResumed(1_000 + 60_000)).toBe(false);
    store.clearResume();
    expect(store.wasJustResumed(2_000)).toBe(false);
  });
});
