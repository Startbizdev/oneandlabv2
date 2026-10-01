import { Redirect, type Href } from 'expo-router';
import { useAuthStore } from '@/store/auth-store';

function moreTabPath(role: string | undefined): Href {
  switch (role) {
    case 'patient':
      return '/(patient)/(tabs)/more';
    case 'pro':
      return '/(pro)/(tabs)/more';
    case 'preleveur':
      return '/(preleveur)/(tabs)/more';
    case 'nurse':
      return '/(nurse)/(tabs)/more';
    default:
      return '/profile';
  }
}

/** Ancien menu compte : son contenu vit dans l'onglet « Plus » du rôle. */
export default function ProfileMenuRoute() {
  const role = useAuthStore((s) => s.user?.role);
  return <Redirect href={moreTabPath(role)} />;
}
