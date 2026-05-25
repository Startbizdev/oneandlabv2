import { useEffect } from 'react';
import { useRouter, useSegments, type Href } from 'expo-router';
import { useAuthStore, isMobileRole } from '@/store/auth-store';

/** Routes accessibles quel que soit le rôle mobile connecté. */
const GLOBAL_SEGMENTS = new Set(['profile']);

export function useAuthGuard() {
  const { token, user, isHydrated } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isHydrated) return;

    const inAuth = String(segments[0]) === '(auth)';

    if (!token) {
      if (!inAuth) router.replace('/(auth)/welcome');
      return;
    }

    if (inAuth) {
      if (user?.role && isMobileRole(user.role)) {
        router.replace(getRoleHome(user.role));
      }
      return;
    }

    const roleSegment = segments[0];
    if (GLOBAL_SEGMENTS.has(String(roleSegment))) return;

    if (user?.role && isMobileRole(user.role)) {
      const expected = roleToSegment(user.role);
      if (String(roleSegment) !== expected && String(roleSegment) !== '(auth)') {
        router.replace(getRoleHome(user.role));
      }
    }
  }, [token, user, isHydrated, segments, router]);
}

function roleToSegment(role: string): string {
  if (role === 'nurse') return '(nurse)';
  if (role === 'pro') return '(pro)';
  if (role === 'preleveur') return '(preleveur)';
  if (role === 'patient') return '(patient)';
  return '(auth)';
}

export function getRoleHome(role: string): Href {
  if (role === 'nurse') return '/(nurse)/(tabs)/appointments';
  if (role === 'pro') return '/(pro)/(tabs)/appointments';
  if (role === 'preleveur') return '/(preleveur)/(tabs)';
  if (role === 'patient') return '/(patient)/(tabs)/appointments';
  return '/(auth)/welcome';
}
