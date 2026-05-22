/**
 * source: frontend/utils/colors.ts + main.css primary #2F80ED
 */

export const THEME_COLORS = {
  primary: '#2F80ED',
  primaryHover: '#1E6DD5',
  success: '#0F9D58',
  error: '#DB4437',
  warning: '#F4B400',
  secondary: '#F8C12D',
} as const;

export const STATUS_BADGE_COLOR: Record<string, string> = {
  pending: 'warning',
  confirmed: 'primary',
  planned: 'primary',
  inProgress: 'primary',
  completed: 'success',
  canceled: 'error',
  expired: 'neutral',
  refused: 'error',
};

export const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  confirmed: 'Confirmé',
  planned: 'Planifié',
  inProgress: 'En cours',
  completed: 'Terminé',
  canceled: 'Annulé',
  expired: 'Expiré',
  refused: 'Refusé',
};
