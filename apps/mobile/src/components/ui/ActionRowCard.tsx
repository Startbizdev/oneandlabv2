import type { AppColors } from '@/theme/colors';
import { getThemedStyles } from '@/theme/use-themed-styles';
import { colors } from '@/theme';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import { radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

export interface ActionRowCardProps {
  title: string;
  body?: string;
  Icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  /** Style « non lu » du centre de notifications (fond accent + barre latérale). */
  highlighted?: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

/**
 * Carte cliquable en ligne — même layout que NotificationCard :
 * [icône] [texte flex:1 minWidth:0] [chevron centré]
 */
export function ActionRowCard({
  title,
  body,
  Icon,
  iconColor,
  iconBg,
  highlighted = false,
  onPress,
  accessibilityLabel,
  accessibilityHint,
}: ActionRowCardProps) {
  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => [
        styles.card,
        highlighted && styles.cardHighlighted,
        pressed && styles.cardPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (body ? `${title}. ${body}` : title)}
      accessibilityHint={accessibilityHint}
    >
      {highlighted ? <View style={styles.highlightStripe} /> : null}

      <View style={styles.row}>
        <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
          <Icon size={18} color={iconColor} strokeWidth={2} />
        </View>

        <View style={styles.content}>
          <Text style={[styles.title, highlighted && styles.titleHighlighted]} numberOfLines={2}>
            {title}
          </Text>
          {body ? <Text style={styles.body}>{body}</Text> : null}
        </View>

        <View style={styles.chevron}>
          <ChevronRight size={16} color={colors.textTertiary} strokeWidth={2} />
        </View>
      </View>
    </Pressable>
  );
}

const ICON = 40;
const CHEVRON = 16;

function buildStyles(c: AppColors) {
  return {
  card: {
    alignSelf: 'stretch',
    backgroundColor: c.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.borderLight,
    overflow: 'hidden',
  },
  cardHighlighted: {
    backgroundColor: c.primaryLight,
    borderColor: c.primaryMid,
  },
  cardPressed: {
    opacity: 0.88,
  },
  highlightStripe: {
    position: 'absolute',
    left: 0,
    top: spacing[3],
    bottom: spacing[3],
    width: 3,
    borderTopRightRadius: radius.full,
    borderBottomRightRadius: radius.full,
    backgroundColor: c.primary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3.5],
    paddingHorizontal: spacing[4],
  },
  iconBox: {
    width: ICON,
    height: ICON,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[3],
    flexShrink: 0,
  },
  content: {
    flex: 1,
    minWidth: 0,
    marginRight: spacing[2],
  },
  title: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: c.textPrimary,
    letterSpacing: -0.15,
  },
  titleHighlighted: {
    fontFamily: fontFamily.bold,
    color: c.primaryDark,
  },
  body: {
    marginTop: spacing[1],
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: c.textSecondary,
    lineHeight: fontSize.xs * 1.5,
  },
  chevron: {
    width: CHEVRON,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
};
}

const styles = new Proxy({} as Record<string, any>, {
  get(_target, prop: string | symbol) {
    if (typeof prop === 'string') {
      return getThemedStyles('components_ui_ActionRowCard_tsx_styles', buildStyles)[prop];
    }
    return undefined;
  },
});
