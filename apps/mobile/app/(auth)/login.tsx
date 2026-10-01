import { Redirect } from 'expo-router';
import { LOGIN_HREF } from '@/features/auth/hooks/use-auth-guard';

/** Ancienne route (notifications sans session) — ouvre l'accueil avec la feuille de connexion. */
export default function LoginRedirect() {
  return <Redirect href={LOGIN_HREF} />;
}
