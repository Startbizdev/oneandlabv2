import React from 'react';
import { Text, type TextProps, type TextStyle } from 'react-native';
import { useStyles } from './make-styles';
import type { Theme } from './theme';
import type { TextVariant } from './typography';

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
  const styles = useStyles(buildStyles);
  const resolvedMultiplier = compact
    ? (maxFontSizeMultiplier ?? COMPACT_MAX_FONT_MULTIPLIER)
    : maxFontSizeMultiplier;

  return (
    <Text
      style={[styles[variant], color ? { color } : null, style]}
      maxFontSizeMultiplier={resolvedMultiplier}
      {...props}
    />
  );
}

function buildStyles({ colors: c, text }: Theme): Record<TextVariant, TextStyle> {
  return {
    display: { ...text.display, color: c.textPrimary },
    title: { ...text.title, color: c.textPrimary },
    headline: { ...text.headline, color: c.textPrimary },
    body: { ...text.body, color: c.textPrimary },
    secondary: { ...text.secondary, color: c.textSecondary },
    caption: { ...text.caption, color: c.textSecondary },
  };
}
