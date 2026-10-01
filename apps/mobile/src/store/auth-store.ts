import { create } from 'zustand';
import type { AuthUser } from '@oneandlab/shared-types';
import { MOBILE_ROLES, type MobileRole } from '@oneandlab/shared-constants';
import { isNonMobileRole } from '@/lib/auth/mobile-access';
import { setSessionExpiredHandler } from '@/lib/auth/session-expiry';
import { api, clearCsrfCache } from '@/api/client';
import { setAuthToken } from '@/lib/auth-token';
import {
  clearAuthSession,
  loadAuthSession,
  saveAuthSession,
  saveAuthUser,
} from '@/lib/auth-storage';
import { clearAppSessionCache } from '@/lib/clear-app-cache';
import { useAppPreferencesStore } from '@/store/app-preferences-store';
import { prefetchAppDataForRole } from '@/lib/prefetch-app-data';
import {
  disableBiometricLogin,
  getBiometricStoredUserId,
  normalizeBiometricUserId,
  refreshBiometricCredentials,
} from '@/lib/biometric-auth';

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isHydrated: boolean;
  setSession: (token: string, user: AuthUser) => Promise<void>;
  clearSession: () => Promise<void>;
  hydrate: () => Promise<void>;
  fetchMe: () => Promise<AuthUser | null>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  isHydrated: false,

  setSession: async (token, user) => {
    const storedUserId = await getBiometricStoredUserId();
    if (
      storedUserId &&
      normalizeBiometricUserId(storedUserId) !== normalizeBiometricUserId(user.id)
    ) {
      await disableBiometricLogin();
    }
    const prefs = useAppPreferencesStore.getState();
    if (prefs.offerTermsAcceptedUserId && prefs.offerTermsAcceptedUserId !== user.id) {
      prefs.clearOfferTermsAcceptance();
    }
    await saveAuthSession(token, user);
    setAuthToken(token);
    set({ token, user });
    clearCsrfCache();
    prefetchAppDataForRole(user.role, user.id);
    void refreshBiometricCredentials(token, user);
  },

  clearSession: async () => {
    try {
      await api.post('/auth/logout');
    } catch (error: unknown) {
      // La session locale est effacée quand même : l'utilisateur doit pouvoir se déconnecter hors ligne.
      console.warn('[auth] POST /auth/logout en échec', error);
    }
    await clearAuthSession();
    await clearAppSessionCache();
    clearCsrfCache();
    setAuthToken(null);
    set({ token: null, user: null });
  },

  hydrate: async () => {
    try {
      const { token, user } = await loadAuthSession();
      setAuthToken(token);
      set({ token, user, isHydrated: true });
      if (token) {
        prefetchAppDataForRole(user?.role, user?.id);
        // Session expirée (401) : effacée par le client API. Réseau ou serveur en panne : la session locale est conservée.
        const fresh = await get().fetchMe();
        if (fresh) prefetchAppDataForRole(fresh.role, fresh.id);
      }
    } catch (error: unknown) {
      console.warn('[auth] restauration de session impossible', error);
      set({ isHydrated: true });
    }
  },

  fetchMe: async () => {
    const { token } = get();
    if (!token) return null;
    try {
      const res = await api.get<AuthUser>('/auth/me?scope=mobile');
      if (res.success && res.data) {
        if (isNonMobileRole(res.data.role)) {
          await get().clearSession();
          return null;
        }
        await saveAuthUser(res.data);
        set({ user: res.data });
        return res.data;
      }
      return null;
    } catch {
      return null;
    }
  },
}));

setSessionExpiredHandler(() => useAuthStore.getState().clearSession());

export function isMobileRole(role: string | undefined): role is MobileRole {
  return MOBILE_ROLES.includes(role as MobileRole);
}
