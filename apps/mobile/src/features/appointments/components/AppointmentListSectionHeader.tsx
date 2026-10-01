import { AppText, spacing, useStyles, font, type Theme } from '@/theme';

/** En-tête de jour dans les listes RDV (« Aujourd'hui », « Demain », « Mardi 6 octobre »). */
export function AppointmentListSectionHeader({ label }: { label: string }) {
  const styles = useStyles(buildStyles);
  return (
    <AppText style={styles.label} accessibilityRole="header">
      {label}
    </AppText>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    label: {
      ...font.semiBold,
      fontSize: fontSize.sm,
      color: c.textSecondary,
      paddingHorizontal: spacing[1],
      paddingTop: spacing[2],
      paddingBottom: spacing[2],
    },
  };
}
