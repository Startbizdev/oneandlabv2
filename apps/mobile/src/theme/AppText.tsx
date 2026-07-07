import React from 'react';
import { Text, type TextProps, type TextStyle } from 'react-native';
import { useThemedStyles } from './use-themed-styles';
import { fontFamily, getTextStyle, type TextVariant } from './typography';
import type { AppColors } from './colors';

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
  const styles = useThemedStyles(buildStyles, 'theme_AppText');
  const variantStyle = getTextStyle(variant);
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

function buildStyles(c: AppColors) {
  return {
    defaultColor: {
      color: c.textPrimary,
    } satisfies TextStyle,
  };
}

export { COMPACT_MAX_FONT_MULTIPLIER };
