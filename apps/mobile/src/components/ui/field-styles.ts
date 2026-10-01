import { radius, spacing, font, type Theme } from '@/theme';

/** Hauteur minimale d'un champ mono-ligne (Input, déclencheur SelectField). */
export const FIELD_MIN_HEIGHT = 52;

/** Styles partagés des champs de formulaire : libellé, conteneur, aide et erreur. */
export function buildFieldStyles({ colors: c, text }: Theme) {
  return {
    wrapper: {
      gap: spacing[1.5],
    },
    label: {
      ...text.secondary,
      ...font.semiBold,
      color: c.textSecondary,
    },
    labelFocused: {
      color: c.primaryDark,
    },
    container: {
      backgroundColor: c.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden' as const,
    },
    hint: {
      ...text.caption,
      color: c.textTertiary,
    },
    error: {
      ...text.caption,
      ...font.medium,
      color: c.error,
    },
  };
}
