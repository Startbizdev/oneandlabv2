import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import React from 'react';
import { View, StyleSheet, type ViewProps } from 'react-native';
import { elevation, radius, spacing } from '@/theme';

type ElevationLevel = keyof typeof elevation;

interface CardProps extends ViewProps {
  shadow?: ElevationLevel;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  radius?: keyof typeof import('@/theme').radius;
  noBorder?: boolean;
}

function CardComponent({
  children,
  shadow = 'sm',
  padding = 'md',
  radius: radiusKey = 'xl',
  noBorder = false,
  style,
  ...props
}: CardProps) {
  const styles = useThemedStyles(buildStyles, 'components_ui_Card_tsx_CardComponent_styles');

  return (
    <View
      style={[
        styles.base,
        elevation[shadow],
        paddingStyles[padding],
        { borderRadius: radiusValues[radiusKey] },
        noBorder && styles.noBorder,
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

export const Card = React.memo(CardComponent);

const radiusValues = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  full: 9999,
};

const paddingStyles = {
  none: {},
  sm: { padding: spacing[3] },
  md: { padding: spacing[4] },
  lg: { padding: spacing[5] },
};

function buildStyles(c: AppColors) {
  return {
  base: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.borderLight,
    overflow: 'hidden' as const,
  },
  noBorder: {
    borderWidth: 0,
    borderColor: 'transparent',
  },
};
}
