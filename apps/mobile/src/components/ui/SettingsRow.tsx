import {
  resolveMoreMenuIconColors,
  type MoreMenuIconAccent,
} from '@/navigation/more-menu-icon-colors';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { Cluster, Row } from '@/components/layout/primitives';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { ChevronRight } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { AppText, radius, spacing, iconSize, useStyles, useTheme, font, type Theme } from '@/theme';

export interface SettingsRowProps {
  icon: LucideIcon;
  label: string;
  /** Précision sous le libellé (ex. « Rappels, messages, résultats »). */
  description?: string;
  /** Valeur courante à droite (ex. « Agrandi »), avant le chevron. */
  value?: string;
  /** Absent : ligne non cliquable (ex. interrupteur passé en `trailing`). */
  onPress?: () => void;
  badge?: number;
  /** Contenu à droite (interrupteur, anneau de progression) — remplace valeur, badge et chevron. */
  trailing?: ReactNode;
  destructive?: boolean;
  iconAccent?: MoreMenuIconAccent;
  iconColor?: string;
  iconBg?: string;
}

function a11yLabel(label: string, description?: string, value?: string, badge?: number): string {
  const parts = [label];
  if (value) parts.push(value);
  if (badge != null && badge > 0) parts.push(`${badge} non lu${badge > 1 ? 's' : ''}`);
  if (description) parts.push(description);
  return parts.join(', ');
}

export function SettingsRow({
  icon: Icon,
  label,
  description,
  value,
  onPress,
  badge,
  trailing,
  destructive,
  iconAccent,
  iconColor,
  iconBg,
}: SettingsRowProps) {
  const { colors: c } = useTheme();
  const styles = useStyles(buildSettingsStyles);

  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const accent = iconAccent ? resolveMoreMenuIconColors(c, iconAccent) : null;
  const ic = iconColor ?? accent?.iconColor ?? (destructive ? c.error : c.primary);
  const ib = iconBg ?? accent?.iconBg ?? (destructive ? c.errorLight : c.primaryLight);

  const actions =
    trailing ??
    (
      <Row align="center" gap={spacing[2]}>
        {value ? (
          <AppText style={styles.value} numberOfLines={1}>
            {value}
          </AppText>
        ) : null}
        {badge != null && badge > 0 ? (
          <View style={styles.badge}>
            <AppText style={styles.badgeText}>{badge > 99 ? '99+' : badge}</AppText>
          </View>
        ) : null}
        {onPress ? (
          <ChevronRight
            size={iconSize.sm}
            color={destructive ? c.error : c.textTertiary}
            strokeWidth={2}
          />
        ) : null}
      </Row>
    );

  const content = (
    <Cluster
      gap={spacing[3]}
      leading={
        <View style={[styles.iconWrap, { backgroundColor: ib }]}>
          <Icon size={iconSize.mdSm} color={ic} strokeWidth={2} />
        </View>
      }
      actions={actions}
    >
      <View style={styles.texts}>
        <AppText style={[styles.label, destructive && styles.labelDestructive]}>{label}</AppText>
        {description ? <AppText style={styles.description}>{description}</AppText> : null}
      </View>
    </Cluster>
  );

  if (!onPress) {
    return <View style={styles.row}>{content}</View>;
  }

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPressIn={() => {
          scale.value = withSpring(0.97, { damping: 20, stiffness: 400 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 18, stiffness: 300 });
        }}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        accessibilityRole="button"
        accessibilityLabel={a11yLabel(label, description, value, badge)}
        style={styles.row}
      >
        {content}
      </Pressable>
    </Animated.View>
  );
}

export function buildSettingsStyles({ colors: c, fontSize, scale }: Theme) {
  return {
    section: { gap: spacing[2] },
    sectionTitle: {
      ...font.semiBold,
      fontSize: fontSize.sm,
      color: c.textSecondary,
      letterSpacing: 0.2,
      paddingHorizontal: spacing[1],
    },
    sectionCard: {
      backgroundColor: c.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: c.borderLight,
      overflow: 'hidden' as const,
    },
    row: {
      minHeight: scale(56),
      justifyContent: 'center' as const,
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[3],
    },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: radius.md,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      flexShrink: 0,
    },
    texts: {
      minWidth: 0,
      gap: 2,
    },
    label: {
      ...font.semiBold,
      fontSize: fontSize.base,
      color: c.textPrimary,
    },
    labelDestructive: { color: c.error },
    description: {
      ...font.regular,
      fontSize: fontSize.xs,
      lineHeight: Math.round(fontSize.xs * 1.4),
      color: c.textSecondary,
    },
    value: {
      ...font.regular,
      fontSize: fontSize.sm,
      color: c.textSecondary,
      maxWidth: 140,
    },
    divider: {
      height: 1,
      alignSelf: 'stretch' as const,
      backgroundColor: c.borderLight,
    },
    badge: {
      minWidth: 22,
      height: 22,
      borderRadius: radius.full,
      backgroundColor: c.error,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      paddingHorizontal: spacing[1],
    },
    badgeText: {
      ...font.bold,
      fontSize: fontSize.xs,
      color: c.textInverse,
    },
  };
}
