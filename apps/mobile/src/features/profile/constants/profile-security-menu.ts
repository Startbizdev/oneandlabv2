import { Lock } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

/** Entrée menu Plus / hub — mot de passe + biométrie. */
export const PROFILE_SECURITY_MENU = {
  label: 'Mot de passe et connexion',
  href: '/profile/security',
  Icon: Lock as LucideIcon,
  iconAccent: 'teal' as const,
};
