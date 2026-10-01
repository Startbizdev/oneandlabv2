import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { elevation, radius, spacing, AppText, useStyles, font, type Theme } from '@/theme';

interface Props {
  title?: string;
  children: ReactNode;
}

export function ProfileNavCard({ title, children }: Props) {
  const styles = useStyles(buildStyles);

  return (
    <View style={styles.section}>
      {title ? <AppText style={styles.sectionTitle}>{title}</AppText> : null}
      <View style={[styles.card, elevation.xs]}>{children}</View>
    </View>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
  section: { gap: spacing[2] },
  sectionTitle: {
    ...font.semiBold,
    fontSize: fontSize.sm,
    color: c.textSecondary,
    letterSpacing: 0.2,
    paddingHorizontal: spacing[1],
  },
  card: {
    backgroundColor: c.surface,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.cardBorder,
    overflow: 'hidden' as const,
  },
};
}
