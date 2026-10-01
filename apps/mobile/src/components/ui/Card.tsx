import React from 'react';
import { View, StyleSheet, type ViewProps } from 'react-native';
import { radius, spacing, useStyles, type Theme } from '@/theme';

interface CardProps extends ViewProps {
  /** `none` quand la carte contient des rangées pleine largeur (`ListRowShell`). */
  padding?: 'none' | 'md';
}

/** Groupe logique sur le fond d'app : surface blanche, trait discret, sans ombre. */
function CardComponent({ children, padding = 'md', style, ...props }: CardProps) {
  const styles = useStyles(buildStyles);

  return (
    <View style={[styles.base, padding === 'md' && styles.padded, style]} {...props}>
      {children}
    </View>
  );
}

export const Card = React.memo(CardComponent);

function buildStyles({ colors: c }: Theme) {
  return {
    base: {
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.cardBorder,
      overflow: 'hidden' as const,
    },
    padded: {
      padding: spacing[4],
    },
  };
}
