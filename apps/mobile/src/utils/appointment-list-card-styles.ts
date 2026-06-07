import { StyleSheet } from 'react-native';
import type { AppColors } from '@/theme/colors';
import { elevation, radius, spacing } from '@/theme/tokens';
import { getThemedStyles } from '@/theme/use-themed-styles';

/** Coque ombre + carte intérieure (évite le clipping iOS avec overflow:hidden). */
function buildAppointmentListCardStyles(c: AppColors) {
  return {
    cardShell: {
      marginBottom: spacing[3],
      borderRadius: radius.xl,
      ...elevation.md,
    },
    card: {
      backgroundColor: c.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: c.borderLight,
      overflow: 'hidden' as const,
    },
    metaSection: {
      gap: spacing[1.5],
      paddingTop: spacing[2.5],
      marginTop: spacing[1],
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.borderLight,
    },
    batchList: {
      gap: spacing[2.5],
      paddingTop: spacing[2.5],
      marginTop: spacing[1],
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.borderLight,
    },
  };
}

export function getAppointmentListCardStyles() {
  return getThemedStyles('appointment-list-card', buildAppointmentListCardStyles);
}

/** @deprecated Préférer getAppointmentListCardStyles() au rendu. */
export const appointmentListCardStyles = new Proxy({} as Record<string, unknown>, {
  get(_target, prop: string | symbol) {
    if (typeof prop === 'string') {
      return getAppointmentListCardStyles()[prop];
    }
    return undefined;
  },
});
