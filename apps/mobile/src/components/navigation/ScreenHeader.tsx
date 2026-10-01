import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Row } from '@/components/layout/primitives';
import { AppText, font, spacing, useStyles, type Theme } from '@/theme';

export type ScreenHeaderVariant = 'large' | 'compact';

type Props = {
  /** `large` : tête d'onglet. `compact` : écran poussé dans une pile. */
  variant: ScreenHeaderVariant;
  /** Texte (rendu ici) ou titre composé (statut, sous-titre…). */
  title?: ReactNode;
  /** Retour (`HeaderBackButton`) ou rien. */
  left?: ReactNode;
  /** Une seule action. */
  right?: ReactNode;
};

/** Header unique de l'app — fond blanc, hairline basse, titre aligné à gauche. */
export function ScreenHeader({ variant, title, left, right }: Props) {
  const styles = useStyles(buildStyles);
  const insets = useSafeAreaInsets();
  const large = variant === 'large';

  return (
    <View
      style={[
        styles.header,
        large ? styles.headerLarge : styles.headerCompact,
        {
          paddingTop: insets.top,
          paddingLeft: insets.left + (left ? spacing[1] : spacing[4]),
          paddingRight: insets.right + (right ? spacing[2] : spacing[4]),
        },
      ]}
    >
      <Row gap={left ? spacing[0.5] : spacing[2]} style={large ? styles.rowLarge : styles.rowCompact}>
        {left ? <View style={styles.side}>{left}</View> : null}
        <View style={styles.titleSlot}>
          {typeof title === 'string' ? (
            <AppText
              accessibilityRole="header"
              style={large ? styles.titleLarge : styles.titleCompact}
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={large ? 0.75 : 0.85}
            >
              {title}
            </AppText>
          ) : (
            title
          )}
        </View>
        {right ? <View style={styles.side}>{right}</View> : null}
      </Row>
    </View>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    header: {
      width: '100%' as const,
      backgroundColor: c.surface,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    headerLarge: {
      paddingBottom: spacing[3],
    },
    headerCompact: {
      paddingBottom: spacing[1],
    },
    rowLarge: {
      minHeight: 52,
    },
    rowCompact: {
      minHeight: 44,
    },
    side: {
      flexShrink: 0,
    },
    titleSlot: {
      flex: 1,
      minWidth: 0,
      justifyContent: 'center' as const,
    },
    titleLarge: {
      ...font.heading,
      fontSize: fontSize['2xl'],
      lineHeight: Math.round(fontSize['2xl'] * 1.2),
      letterSpacing: -0.4,
      color: c.textPrimary,
    },
    titleCompact: {
      ...font.heading,
      fontSize: fontSize.md,
      lineHeight: Math.round(fontSize.md * 1.3),
      letterSpacing: -0.2,
      color: c.textPrimary,
    },
  };
}
