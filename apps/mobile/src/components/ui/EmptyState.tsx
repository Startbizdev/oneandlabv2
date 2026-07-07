import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import React from 'react';
import { Image, type ImageSourcePropType, View, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import type { LucideIcon } from 'lucide-react-native';
import {
  radius,
  spacing,
  iconSize,
  AppText,
  useLayoutMetrics,
  centeredCopyMaxWidth,
  responsiveValue,
} from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';
import { emptyStateEntering } from '@/lib/platform/list-entering-animation';
import { Button } from './Button';

interface EmptyStateProps {
  title: string;
  description?: string;
  Icon?: LucideIcon;
  /** Emoji centré (prioritaire sur Icon, ignoré si imageSource). */
  emoji?: string;
  emojiSize?: number;
  /** Illustration sans cadre (prioritaire sur Icon). */
  imageSource?: ImageSourcePropType;
  imageWidth?: number;
  imageHeight?: number;
  actionLabel?: string;
  onAction?: () => void;
}

function EmptyStateComponent({
  title,
  description,
  Icon,
  emoji,
  emojiSize = 56,
  imageSource,
  imageWidth = 220,
  imageHeight,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const c = useAppColors();
  const layout = useLayoutMetrics();
  const styles = useThemedStyles(buildStyles, 'components_ui_EmptyState_tsx_EmptyStateComponent_styles');
  const descriptionMaxWidth = centeredCopyMaxWidth(layout);
  const actionMaxWidth = responsiveValue(layout, { compact: 220, default: 240, wide: 280 });

  const entering = emptyStateEntering();
  const Shell = entering ? Animated.View : View;

  return (
    <Shell entering={entering} style={styles.container}>
      {imageSource ? (
        <Image
          source={imageSource}
          style={[
            styles.image,
            {
              width: imageWidth,
              height: imageHeight ?? imageWidth * 0.92,
            },
          ]}
          resizeMode="contain"
          accessibilityRole="image"
        />
      ) : emoji ? (
        <AppText
          style={[styles.emoji, { fontSize: emojiSize, lineHeight: emojiSize * 1.08 }]}
          accessibilityRole="image"
        >
          {emoji}
        </AppText>
      ) : Icon ? (
        <View style={styles.iconWrap}>
          <Icon size={iconSize.xl} color={c.textTertiary} strokeWidth={1.5} />
        </View>
      ) : null}

      <AppText style={styles.title}>{title}</AppText>

      {description ? (
        <AppText style={[styles.description, { maxWidth: descriptionMaxWidth }]}>{description}</AppText>
      ) : null}

      {actionLabel && onAction ? (
        <View style={[styles.action, { maxWidth: actionMaxWidth }]}>
          <Button title={actionLabel} onPress={onAction} size="lg" fullWidth />
        </View>
      ) : null}
    </Shell>
  );
}

export const EmptyState = React.memo(EmptyStateComponent);

function buildStyles(c: AppColors) {
  return {
  container: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: spacing[12],
    paddingHorizontal: spacing[6],
    gap: spacing[3],
  },
  image: {
    marginBottom: spacing[2],
  },
  emoji: {
    marginBottom: spacing[1],
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: radius['2xl'],
    backgroundColor: c.surfaceAlt,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: spacing[1],
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    color: c.textPrimary,
    textAlign: 'center' as const,
    letterSpacing: -0.3,
  },
  description: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: c.textSecondary,
    textAlign: 'center' as const,
    lineHeight: fontSize.sm * 1.55,
  },
  action: {
    marginTop: spacing[2],
    width: '100%' as const,
  },
};
}
