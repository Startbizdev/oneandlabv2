import { Lock } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

/** Entrée « Mot de passe et connexion » (onglet Plus, Mon profil) — mot de passe + biométrie. */
export const PROFILE_SECURITY_MENU: { label: string; href: '/profile/security'; Icon: LucideIcon } = {
  label: 'Mot de passe et connexion',
  href: '/profile/security',
  Icon: Lock,
};
