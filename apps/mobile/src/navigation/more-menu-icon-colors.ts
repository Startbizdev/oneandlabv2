import type { AppColors } from '@/theme/colors';

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