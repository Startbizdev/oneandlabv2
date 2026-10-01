import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { computed } from 'vue';

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('useAuth.fetchCurrentUser', () => {
  const storage = new Map<string, string>();

  beforeEach(() => {
    storage.clear();
    storage.set('auth_token', 't1');
    vi.stubGlobal('useState', <T>(_key: string, init: () => T) => ({ value: init() }));
    vi.stubGlobal('computed', computed);
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    });
    Object.assign(process, { client: true });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    Object.assign(process, { client: undefined });
  });

  async function authWithToken() {
    const { useAuth } = await import('../../composables/useAuth');
    const auth = useAuth();
    auth.token.value = 't1';
    return auth;
  }

  it('clears the session on 401 UNAUTHORIZED', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse(401, { success: false, error: 'Token invalide', code: 'UNAUTHORIZED' })),
    );
    const auth = await authWithToken();

    expect(await auth.fetchCurrentUser()).toBeNull();
    expect(auth.token.value).toBeNull();
    expect(storage.has('auth_token')).toBe(false);
  });

  it('keeps the session when the server fails during authentication (500)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse(500, { success: false, error: 'Erreur serveur', code: 'SERVER_ERROR' })),
    );
    const auth = await authWithToken();

    expect(await auth.fetchCurrentUser()).toBeNull();
    expect(auth.token.value).toBe('t1');
    expect(storage.get('auth_token')).toBe('t1');
  });

  it('keeps the session when the error text mentions 401 without the status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse(403, { success: false, error: 'Erreur 401 Unauthorized', code: 'FORBIDDEN' })),
    );
    const auth = await authWithToken();

    await auth.fetchCurrentUser();
    expect(auth.token.value).toBe('t1');
  });
});
