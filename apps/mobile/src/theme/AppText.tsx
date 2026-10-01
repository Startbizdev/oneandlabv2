import React from 'react';
import { Text, type TextProps, type TextStyle } from 'react-native';
import { useStyles } from './make-styles';
import type { Theme } from './theme';
import { useTheme } from './ThemeProvider';
import { getTextStyle, type TextVariant } from './typography';

const COMPACT_MAX_FONT_MULTIPLIER = 1.2;

export type AppTextProps = TextProps & {
  variant?: TextVariant;
  color?: string;
  /** Calendrier / tabs compacts — limite le scale système pour éviter l'overflow. */
  compact?: boolean;
};

export function AppText({
  variant = 'body',
  color,
  compact = false,
  style,
  maxFontSizeMultiplier,
  ...props
}: AppTextProps) {
  const theme = useTheme();
  const styles = useStyles(buildStyles);
  const variantStyle = getTextStyle(variant, theme.scale);
  const resolvedMultiplier = compact
    ? (maxFontSizeMultiplier ?? COMPACT_MAX_FONT_MULTIPLIER)
    : maxFontSizeMultiplier;

  return (
    <Text
      style={[variantStyle, color ? { color } : styles.defaultColor, style]}
      maxFontSizeMultiplier={resolvedMultiplier}
      {...props}
    />
  );
}

function buildStyles({ colors: c }: Theme) {
  return {
    defaultColor: {
      color: c.textPrimary,
    } satisfies TextStyle,
  };
}

export { COMPACT_MAX_FONT_MULTIPLIER };
