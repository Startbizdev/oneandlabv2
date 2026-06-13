import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { actionsSlot, flexText, layoutRow } from '@/theme/layout-styles';
import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

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
 * Pattern unifié documents, notifications, nav rows.
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
  const styles = useThemedStyles(buildListRowShellStyles, 'ListRowShell');

  const bodyContent =
    body ??
    (title ? (
      <>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        {hint ? (
          <Text style={styles.hint} numberOfLines={2}>
            {hint}
          </Text>
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
          disabled={rowDisabled || !onBodyPress}
          style={({ pressed }) => [
            styles.body,
            pressed && !rowDisabled && styles.bodyPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={bodyAccessibilityLabel ?? title}
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

function buildListRowShellStyles(c: AppColors) {
  return {
    row: {
      ...layoutRow(spacing[3]),
      alignItems: 'center' as const,
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[3],
    },
    rowBorderTop: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
    rowDisabled: {
      opacity: 0.65,
    },
    leading: {
      flexShrink: 0,
    },
    body: {
      ...flexText,
      justifyContent: 'center' as const,
    },
    bodyPressed: {
      opacity: 0.92,
    },
    title: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.base,
      color: c.textPrimary,
      lineHeight: fontSize.base * 1.3,
    },
    hint: {
      marginTop: spacing[0.5],
      fontFamily: fontFamily.regular,
      fontSize: fontSize.xs,
      color: c.textSecondary,
      lineHeight: fontSize.xs * 1.35,
    },
    trailing: {
      ...layoutRow(spacing[2]),
      flexShrink: 0,
    },
    actions: actionsSlot(),
  };
}
