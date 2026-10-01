import { actionsSlot, flexText, hairlineTop, layoutRow } from '@/theme/layout-styles';
import type { ReactNode } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { spacing, AppText, useStyles, font, type Theme } from '@/theme';

interface ListRowShellProps {
  leading?: ReactNode;
  /** Corps pressable (texte). */
  onBodyPress?: () => void;
  bodyAccessibilityLabel?: string;
  bodyDisabled?: boolean;
  title?: string;
  hint?: string;
  body?: ReactNode;
  trailing?: ReactNode;
  actions?: ReactNode;
  topBorder?: boolean;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}

/**
 * Rangée liste standard : [ leading | corps flex:1 | trailing/actions ].
 * Les textes reviennent à la ligne plutôt que d'être tronqués.
 */
export function ListRowShell({
  leading,
  onBodyPress,
  bodyAccessibilityLabel,
  bodyDisabled,
  title,
  hint,
  body,
  trailing,
  actions,
  topBorder = false,
  style,
  disabled = false,
}: ListRowShellProps) {
  const styles = useStyles(buildListRowShellStyles);

  const bodyContent =
    body ??
    (title ? (
      <>
        <AppText style={styles.title}>{title}</AppText>
        {hint ? (
          <AppText variant="caption" style={styles.hint}>
            {hint}
          </AppText>
        ) : null}
      </>
    ) : null);

  const rowDisabled = disabled || bodyDisabled;

  return (
    <View style={[styles.row, topBorder && styles.rowBorderTop, style, rowDisabled && styles.rowDisabled]}>
      {leading ? <View style={styles.leading}>{leading}</View> : null}

      {onBodyPress ? (
        <Pressable
          onPress={onBodyPress}
          disabled={rowDisabled}
          style={({ pressed }) => [styles.body, pressed && !rowDisabled && styles.bodyPressed]}
          accessibilityRole="button"
          accessibilityLabel={bodyAccessibilityLabel ?? title}
          accessibilityState={{ disabled: !!rowDisabled }}
        >
          {bodyContent}
        </Pressable>
      ) : (
        <View style={styles.body}>{bodyContent}</View>
      )}

      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
      {actions ? <View style={styles.actions}>{actions}</View> : null}
    </View>
  );
}

function buildListRowShellStyles({ colors: c, text }: Theme) {
  return {
    row: {
      ...layoutRow(spacing[3]),
      alignItems: 'center' as const,
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[3],
    },
    rowBorderTop: hairlineTop(c),
    rowDisabled: {
      opacity: 0.5,
    },
    leading: {
      flexShrink: 0,
    },
    body: {
      ...flexText,
      justifyContent: 'center' as const,
    },
    bodyPressed: {
      opacity: 0.6,
    },
    title: {
      ...text.body,
      ...font.semiBold,
      color: c.textPrimary,
    },
    hint: {
      marginTop: spacing[0.5],
    },
    trailing: {
      ...layoutRow(spacing[2]),
      alignItems: 'center' as const,
      flexShrink: 0,
    },
    actions: actionsSlot(),
  };
}
