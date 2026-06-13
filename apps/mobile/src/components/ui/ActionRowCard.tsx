import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';

import { Cluster } from '@/components/layout/primitives';
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
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'components_ui_ActionRowCard_tsx_styles');
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

      <Cluster
        gap={spacing[3]}
        style={styles.row}
        leading={
          <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
            <Icon size={18} color={iconColor} strokeWidth={2} />
          </View>
        }
        actions={
          <View style={styles.chevron}>
            <ChevronRight size={16} color={c.textTertiary} strokeWidth={2} />
          </View>
        }
      >
        <View style={styles.content}>
          <Text style={[styles.title, highlighted && styles.titleHighlighted]} numberOfLines={2}>
            {title}
          </Text>
          {body ? <Text style={styles.body}>{body}</Text> : null}
        </View>
      </Cluster>
    </Pressable>
  );
}

const ICON = 40;
const CHEVRON = 16;

function buildStyles(c: AppColors) {
  return {
  card: {
    alignSelf: 'stretch' as const,
    backgroundColor: c.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.borderLight,
    overflow: 'hidden' as const,
  },
  cardHighlighted: {
    backgroundColor: c.primaryLight,
    borderColor: c.primaryMid,
  },
  cardPressed: {
    opacity: 0.88,
  },
  highlightStripe: {
    position: 'absolute' as const,
    left: 0,
    top: spacing[3],
    bottom: spacing[3],
    width: 3,
    borderTopRightRadius: radius.full,
    borderBottomRightRadius: radius.full,
    backgroundColor: c.primary,
  },
  row: {
    paddingVertical: spacing[3.5],
    paddingHorizontal: spacing[4],
  },
  iconBox: {
    width: ICON,
    height: ICON,
    borderRadius: radius.md,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexShrink: 0,
  },
  content: {
    minWidth: 0,
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
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexShrink: 0,
  },
};
}

