import { Redirect } from 'expo-router';
import { useAuthStore } from '@/store/auth-store';

/** Préférences soins intégrées au profil infirmier principal. */
export default function ProfilePreferencesRoute() {
  const role = useAuthStore((s) => s.user?.role);
  if (role === 'nurse') {
    return <Redirect href="/profile" />;
  }
  return <Redirect href="/profile" />;
}
