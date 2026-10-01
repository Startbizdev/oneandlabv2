import { View } from 'react-native';
import { AppText, font, iconSize, radius, spacing, useStyles, type Theme } from '@/theme';

const BADGE_SIZE = 18;

/** Libellé de pastille : rien sous 1, plafonné à « 99+ ». */
export function formatCountBadge(count: number | undefined): string | undefined {
  if (!count || count < 1) return undefined;
  return count > 99 ? '99+' : String(count);
}

/** Pastille numérique posée en haut à droite d'une icône 24 pt (tab bar, header). */
export function CountBadge({ label }: { label: string }) {
  const styles = useStyles(buildStyles);
  return (
    <View style={styles.badge} pointerEvents="none">
      <AppText style={styles.text} maxFontSizeMultiplier={1}>
        {label}
      </AppText>
    </View>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    badge: {
      position: 'absolute' as const,
      top: -spacing[1],
      left: iconSize.lg - spacing[2],
      minWidth: BADGE_SIZE,
      minHeight: BADGE_SIZE,
      paddingHorizontal: spacing[1],
      borderRadius: radius.full,
      backgroundColor: c.error,
      borderWidth: 1.5,
      borderColor: c.surface,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    text: {
      ...font.bold,
      fontSize: fontSize['2xs'],
      lineHeight: Math.round(fontSize['2xs'] * 1.2),
      color: c.textInverse,
      includeFontPadding: false,
    },
  };
}
