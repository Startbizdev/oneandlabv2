import type { Href } from 'expo-router';

/** Route notifications dans la stack du rôle (retour natif fonctionnel). */
export function getNotificationsPath(role: string | undefined): Href {
  switch (role) {
    case 'nurse':
      return '/(nurse)/notifications';
    case 'pro':
      return '/(pro)/notifications';
    case 'preleveur':
      return '/(preleveur)/notifications';
    case 'patient':
      return '/(patient)/notifications';
    default:
      return '/(auth)/login';
  }
}
