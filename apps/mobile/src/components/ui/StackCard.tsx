import { hairlineBottom, hairlineTop, layoutRow } from '@/theme/layout-styles';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { radius, spacing, AppText, useStyles, font, type Theme } from '@/theme';

/** Inset intérieur — parité `AppointmentListRowCard` (`inner`). */
export const STACK_CARD_INSET_X = spacing[4];
export const STACK_CARD_INSET_Y = spacing[3.5];

interface StackCardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

function StackCardRoot({ children, style }: StackCardProps) {
  const styles = useStyles(buildStackCardStyles);

  return (
    <View style={[styles.card, style]}>
      <View style={styles.cardInner}>{children}</View>
    </View>
  );
}

interface SectionProps {
  children: ReactNode;
  bordered?: 'bottom' | 'none';
  pressable?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

function StackCardSection({
  children,
  bordered = 'none',
  pressable = false,
  onPress,
  accessibilityLabel,
  style,
}: SectionProps) {
  const styles = useStyles(buildStackCardStyles);
  const sectionStyle = [
    styles.section,
    bordered === 'bottom' && styles.sectionBorderBottom,
    style,
  ];

  if (pressable && onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [sectionStyle, pressed && styles.sectionPressed]}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={sectionStyle}>{children}</View>;
}

interface FooterProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

function StackCardFooter({ children, style }: FooterProps) {
  const styles = useStyles(buildStackCardStyles);

  return <View style={[styles.footer, style]}>{children}</View>;
}

interface FooterMetaProps {
  children: ReactNode;
  numberOfLines?: number;
}

function StackCardFooterMeta({ children, numberOfLines = 1 }: FooterMetaProps) {
  const styles = useStyles(buildStackCardStyles);

  return (
    <AppText style={styles.footerMeta} numberOfLines={numberOfLines}>
      {children}
    </AppText>
  );
}

function StackCardFooterActions({ children }: { children: ReactNode }) {
  const styles = useStyles(buildStackCardStyles);

  return <View style={styles.footerActions}>{children}</View>;
}

export const StackCard = Object.assign(StackCardRoot, {
  Section: StackCardSection,
  Footer: StackCardFooter,
  FooterMeta: StackCardFooterMeta,
  FooterActions: StackCardFooterActions,
});

function buildStackCardStyles({ colors: c, fontSize }: Theme) {
  return {
    card: {
      backgroundColor: c.surface,
      borderRadius: radius.xl,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.cardBorder,
      overflow: 'hidden' as const,
    },
    cardInner: {
      paddingHorizontal: STACK_CARD_INSET_X,
      paddingTop: STACK_CARD_INSET_Y,
      paddingBottom: STACK_CARD_INSET_Y,
    },
    section: {},
    sectionBorderBottom: {
      marginHorizontal: -STACK_CARD_INSET_X,
      paddingHorizontal: STACK_CARD_INSET_X,
      paddingBottom: spacing[3],
      marginBottom: spacing[3],
      ...hairlineBottom(c),
    },
    sectionPressed: {
      opacity: 0.88,
    },
    footer: {
      ...layoutRow(spacing[2]),
      alignItems: 'center' as const,
      marginHorizontal: -STACK_CARD_INSET_X,
      paddingHorizontal: STACK_CARD_INSET_X,
      paddingTop: spacing[3],
      marginTop: spacing[3],
      ...hairlineTop(c),
    },
    footerMeta: {
      flex: 1,
      minWidth: 0,
      ...font.medium,
      fontSize: fontSize.xs,
      color: c.textTertiary,
      lineHeight: fontSize.xs * 1.45,
    },
    footerActions: {
      minWidth: 0,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing[1],
      flexShrink: 0,
    },
  };
}
