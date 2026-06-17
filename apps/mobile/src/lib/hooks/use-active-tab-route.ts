import { usePathname, useSegments } from 'expo-router';

/**
 * Onglet actif avec NativeTabs (expo-router).
 * Les écrans d’onglet restent montés : ne pas se fier à useIsFocused seul.
 */
export function useActiveTabRoute(tabName: string): boolean {
  const segments = useSegments();
  const pathname = usePathname();
  const leaf = segments[segments.length - 1];

  if (leaf === tabName) return true;

  return pathname.endsWith(`/${tabName}`) || pathname.endsWith(tabName);
}
