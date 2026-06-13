import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import React from 'react';
import { Image, type ImageSourcePropType, Text, View, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import type { LucideIcon } from 'lucide-react-native';
import { radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';
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
  const styles = useThemedStyles(buildStyles, 'components_ui_EmptyState_tsx_EmptyStateComponent_styles');

  return (
    <Animated.View entering={FadeInDown.duration(400).springify()} style={styles.container}>
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
        <Text
          style={[styles.emoji, { fontSize: emojiSize, lineHeight: emojiSize * 1.08 }]}
          accessibilityRole="image"
        >
          {emoji}
        </Text>
      ) : Icon ? (
        <View style={styles.iconWrap}>
          <Icon size={28} color={c.textTertiary} strokeWidth={1.5} />
        </View>
      ) : null}

      <Animated.Text style={styles.title}>{title}</Animated.Text>

      {description ? (
        <Animated.Text style={styles.description}>{description}</Animated.Text>
      ) : null}

      {actionLabel && onAction ? (
        <View style={styles.action}>
          <Button title={actionLabel} onPress={onAction} size="lg" fullWidth />
        </View>
      ) : null}
    </Animated.View>
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
    maxWidth: 260,
  },
  action: {
    marginTop: spacing[2],
    width: '100%' as const,
    maxWidth: 240,
  },
};
}
