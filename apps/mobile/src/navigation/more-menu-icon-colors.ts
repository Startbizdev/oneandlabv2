import type { AppColors } from '@/theme/colors';
import { useMemo } from 'react';
import { useAppColors } from '@/theme/use-app-colors';
import { useAppPreferencesStore } from '@/store/app-preferences-store';

/** Accents sémantiques pour les icônes du menu « Plus ». */
export type MoreMenuIconAccent =
  | 'settings'
  | 'results'
  | 'teal'
  | 'warning'
  | 'muted'
  | 'heart';

export function resolveMoreMenuIconColors(
  c: AppColors,
  accent: MoreMenuIconAccent,
): { iconColor: string; iconBg: string } {
  switch (accent) {
    case 'results':
      return { iconColor: c.success, iconBg: c.successLight };
    case 'warning':
      return { iconColor: c.warning, iconBg: c.warningLight };
    case 'heart':
      return { iconColor: c.error, iconBg: c.errorLight };
    case 'muted':
      return { iconColor: c.textSecondary, iconBg: c.surfaceAlt };
    case 'settings':
    case 'teal':
    default:
      return { iconColor: c.primary, iconBg: c.primaryLight };
  }
}

/** @deprecated Préférer iconAccent sur MoreMenuItem (résolution au rendu). */
export function useMoreMenuIconColors() {
  const c = useAppColors();
  const colorblindType = useAppPreferencesStore((s) => s.colorblindType);
  return useMemo(
    () => ({
      settings: resolveMoreMenuIconColors(c, 'settings'),
      results: resolveMoreMenuIconColors(c, 'results'),
      teal: resolveMoreMenuIconColors(c, 'teal'),
      warning: resolveMoreMenuIconColors(c, 'warning'),
      muted: resolveMoreMenuIconColors(c, 'muted'),
      heart: resolveMoreMenuIconColors(c, 'heart'),
    }),
    [c, colorblindType],
  );
}
