/**
 * Constantes de couleurs pour badges et états (Tailwind).
 * Réutilisables dans tout le projet.
 */

export type BadgeVariant = 'solid' | 'subtle' | 'outline'

/** Palette générique pour les badges */
export const BADGE_COLORS = {
  primary: {
    solid: 'bg-primary-100 text-primary-800 dark:bg-primary-900/40 dark:text-primary-200',
    subtle: 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 border border-primary-200 dark:border-primary-700',
    outline: 'bg-transparent text-primary-700 dark:text-primary-300 border border-primary-300 dark:border-primary-600',
  },
  success: {
    solid: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
    subtle: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 border border-green-200 dark:border-green-700',
    outline: 'bg-transparent text-green-700 dark:text-green-300 border border-green-300 dark:border-green-600',
  },
  error: {
    solid: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
    subtle: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 border border-red-200 dark:border-red-700',
    outline: 'bg-transparent text-red-700 dark:text-red-300 border border-red-300 dark:border-red-600',
  },
  warning: {
    solid: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
    subtle: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-700',
    outline: 'bg-transparent text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-600',
  },
  neutral: {
    solid: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    subtle: 'bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-600',
    outline: 'bg-transparent text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600',
  },
  /** Bleu (pour type laboratoire, etc.) */
  blue: {
    solid: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
    subtle: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-700',
    outline: 'bg-transparent text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-600',
  },
} as const

export type BadgeColorKey = keyof typeof BADGE_COLORS

/** Mapping statut rendez-vous → clé de BADGE_COLORS */
export const STATUS_BADGE_COLOR: Record<string, BadgeColorKey> = {
  pending: 'warning',
  confirmed: 'primary',
  inProgress: 'primary',
  completed: 'success',
  canceled: 'error',
  expired: 'neutral',
  refused: 'error',
}

/** Mapping type rendez-vous → clé de BADGE_COLORS */
export const TYPE_BADGE_COLOR: Record<string, BadgeColorKey> = {
  blood_test: 'blue',
  nursing: 'success',
  nurse: 'success',
}

/**
 * Retourne les classes Tailwind pour un badge selon la clé de couleur et le variant.
 */
export function getBadgeClasses(
  colorKey: BadgeColorKey | string,
  variant: BadgeVariant = 'subtle',
): string {
  const key = colorKey in BADGE_COLORS ? (colorKey as BadgeColorKey) : 'neutral'
  const palette = BADGE_COLORS[key] ?? BADGE_COLORS.neutral
  return palette[variant] ?? palette.subtle
}

/**
 * Classes Tailwind pour le texte uniquement (icônes, etc.)
 */
export const BADGE_TEXT_COLORS: Record<BadgeColorKey, string> = {
  primary: 'text-primary-600 dark:text-primary-400',
  success: 'text-green-600 dark:text-green-400',
  error: 'text-red-600 dark:text-red-400',
  warning: 'text-amber-600 dark:text-amber-400',
  neutral: 'text-gray-600 dark:text-gray-400',
  blue: 'text-blue-600 dark:text-blue-400',
}

export function getBadgeTextClass(colorKey: BadgeColorKey | string): string {
  const key = colorKey in BADGE_TEXT_COLORS ? (colorKey as BadgeColorKey) : 'neutral'
  return BADGE_TEXT_COLORS[key] ?? BADGE_TEXT_COLORS.neutral
}
