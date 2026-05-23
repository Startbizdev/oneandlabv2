import { create } from 'zustand';
import type { AuthUser } from '@oneandlab/shared-types';
import { MOBILE_ROLES, type MobileRole } from '@oneandlab/shared-constants';
import { isNonMobileRole } from '@/lib/auth/mobile-access';
import { api, clearCsrfCache } from '@/api/client';
import { setAuthToken } from '@/lib/auth-token';
import {
  clearAuthSession,
  loadAuthSession,
  saveAuthSession,
  saveAuthUser,
} from '@/lib/auth-storage';
import { prefetchAppointmentsForUser } from '@/features/appointments/lib/prefetch-appointments';
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
    await saveAuthSession(token, user);
    setAuthToken(token);
    set({ token, user });
    clearCsrfCache();
    prefetchAppointmentsForUser(user.role);
    void refreshBiometricCredentials(token, user);
  },

  clearSession: async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      /* ignore */
    }
    await clearAuthSession();
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
        prefetchAppointmentsForUser(user?.role);
        const fresh = await get().fetchMe();
        if (fresh) prefetchAppointmentsForUser(fresh.role);
        if (!fresh) await get().clearSession();
      }
    } catch {
      set({ isHydrated: true });
    }
  },

  fetchMe: async () => {
    const { token } = get();
    if (!token) return null;
    try {
      const res = await api.get<AuthUser>('/auth/me');
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

export function isMobileRole(role: string | undefined): role is MobileRole {
  return MOBILE_ROLES.includes(role as MobileRole);
}
