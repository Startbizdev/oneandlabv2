import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { radius, spacing, AppText, useStyles, type Theme } from '@/theme';

interface Props {
  title?: string;
  children: ReactNode;
  /** Liste dense (lignes contact / assignés). */
  compact?: boolean;
}

/** Section de la fiche RDV : même carte que `Card`, titre `headline` facultatif. */
export function DetailSection({ title, children, compact }: Props) {
  const styles = useStyles(buildStyles);
  return (
    <View style={[styles.wrap, compact && styles.compact]}>
      {title ? (
        <AppText variant="headline" accessibilityRole="header">
          {title}
        </AppText>
      ) : null}
      <View style={[styles.body, compact && styles.bodyCompact]}>{children}</View>
    </View>
  );
}

function buildStyles({ colors: c }: Theme) {
  return {
    wrap: {
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.cardBorder,
      padding: spacing[4],
      gap: spacing[3],
    },
    compact: {
      paddingVertical: spacing[2],
      paddingHorizontal: spacing[4],
      gap: 0,
    },
    body: {
      gap: spacing[2],
    },
    bodyCompact: {
      gap: 0,
    },
  };
}
