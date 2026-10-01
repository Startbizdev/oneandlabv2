import { useAppColors } from '@/theme/use-app-colors';
import React from 'react';
import { Image, View } from 'react-native';
import Animated from 'react-native-reanimated';
import type { LucideIcon } from 'lucide-react-native';
import {
  centeredActionMaxWidth,
  centeredCopyMaxWidth,
  ICON_STROKE_WIDTH,
  iconSize,
  radius,
  responsiveValue,
  spacing,
  AppText,
  useLayoutMetrics,
  useStyles,
  type Theme,
} from '@/theme';
import { ILLUSTRATIONS, type IllustrationKey } from '@/constants/illustrations';
import { emptyStateEntering } from '@/lib/platform/list-entering-animation';
import { Button } from './Button';

interface EmptyStateProps {
  /** Titre court (quelques mots). */
  title: string;
  /** Une phrase au plus. */
  description?: string;
  /** Illustration éditoriale (`constants/illustrations.ts`) — prioritaire sur `Icon`. */
  illustration?: IllustrationKey;
  /** Icône Lucide quand aucune illustration ne correspond à l'état. */
  Icon?: LucideIcon;
  actionLabel?: string;
  onAction?: () => void;
}

function EmptyStateComponent({
  title,
  description,
  illustration,
  Icon,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const c = useAppColors();
  const layout = useLayoutMetrics();
  const styles = useStyles(buildStyles);
  const illustrationSize = responsiveValue(layout, { compact: 136, default: 160, wide: 184 });

  const entering = emptyStateEntering();
  const Shell = entering ? Animated.View : View;

  return (
    <Shell entering={entering} style={styles.container}>
      {illustration ? (
        <Image
          source={ILLUSTRATIONS[illustration]}
          style={[styles.illustration, { width: illustrationSize, height: illustrationSize }]}
          resizeMode="contain"
          accessible={false}
        />
      ) : Icon ? (
        <View style={styles.iconWell}>
          <Icon size={iconSize.xl} color={c.textSecondary} strokeWidth={ICON_STROKE_WIDTH} />
        </View>
      ) : null}

      <View style={[styles.copy, { maxWidth: centeredCopyMaxWidth(layout) }]}>
        <AppText variant="headline" style={styles.centered} accessibilityRole="header">
          {title}
        </AppText>
        {description ? (
          <AppText variant="secondary" style={styles.centered}>
            {description}
          </AppText>
        ) : null}
      </View>

      {actionLabel && onAction ? (
        <View style={[styles.action, { maxWidth: centeredActionMaxWidth(layout) }]}>
          <Button title={actionLabel} onPress={onAction} size="lg" fullWidth />
        </View>
      ) : null}
    </Shell>
  );
}

export const EmptyState = React.memo(EmptyStateComponent);

function buildStyles({ colors: c }: Theme) {
  return {
    container: {
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      paddingVertical: spacing[8],
      paddingHorizontal: spacing[6],
      gap: spacing[4],
    },
    illustration: {
      marginBottom: spacing[1],
    },
    iconWell: {
      width: 72,
      height: 72,
      borderRadius: radius.full,
      backgroundColor: c.surfaceAlt,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    copy: {
      width: '100%' as const,
      alignItems: 'center' as const,
      gap: spacing[2],
    },
    centered: {
      textAlign: 'center' as const,
    },
    action: {
      marginTop: spacing[2],
      width: '100%' as const,
    },
  };
}
