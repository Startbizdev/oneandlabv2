import { useEffect, useState } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { isTutorialRole } from '@oneandlab/onboarding';
import { useAuthStore, isMobileRole } from '@/store/auth-store';
import { useAppPreferencesStore } from '@/store/app-preferences-store';
import { getOnboardingHref, isOnboardingSegment } from '../utils/onboarding-route';

const GLOBAL_SEGMENTS = new Set(['profile', 'notifications']);

/** Redirige vers le tutoriel startup après première connexion (par rôle). */
export function useOnboardingGate() {
  const router = useRouter();
  const segments = useSegments();
  const { token, user, isHydrated } = useAuthStore();
  const isOnboardingCompleted = useAppPreferencesStore((s) => s.isOnboardingCompleted);
  const [prefsHydrated, setPrefsHydrated] = useState(
    () => useAppPreferencesStore.persist.hasHydrated(),
  );

  useEffect(() => {
    if (useAppPreferencesStore.persist.hasHydrated()) {
      setPrefsHydrated(true);
      return;
    }
    return useAppPreferencesStore.persist.onFinishHydration(() => {
      setPrefsHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!isHydrated || !prefsHydrated || !token || !user?.role) return;
    if (!isMobileRole(user.role) || !isTutorialRole(user.role)) return;
    if (user.must_change_password) return;

    const role = user.role;
    const root = String(segments[0] ?? '');
    if (root === '(auth)' || GLOBAL_SEGMENTS.has(root)) return;
    if (isOnboardingSegment(segments)) return;
    if (isOnboardingCompleted(role)) return;

    router.replace(getOnboardingHref(role));
  }, [
    isHydrated,
    prefsHydrated,
    token,
    user,
    segments,
    router,
    isOnboardingCompleted,
  ]);
}
