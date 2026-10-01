import { useAuthStore } from '@/store/auth-store';

function formatFirstName(raw?: string | null): string {
  const trimmed = raw?.trim();
  if (!trimmed) return 'vous';
  // Majuscule à chaque partie (« jean-pierre » → « Jean-Pierre »), sans toucher au reste.
  return trimmed
    .split(/([\s-]+)/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

/** Grand titre de l'onglet d'accueil. */
export function useGreetingTitle(): string {
  const firstName = useAuthStore((s) => s.user?.first_name);
  return `Bonjour ${formatFirstName(firstName)} !`;
}
