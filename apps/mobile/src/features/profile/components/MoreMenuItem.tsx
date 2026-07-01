import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import {
  resolveMoreMenuIconColors,
  type MoreMenuIconAccent,
} from '@/navigation/more-menu-icon-colors';
import { useAppColors } from '@/theme/use-app-colors';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Cluster } from '@/components/layout/primitives';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { ChevronRight } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

export interface MoreMenuItemProps {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  badge?: number;
  /** Contenu à droite (ex. anneau de progression) — remplace badge et chevron. */
  trailing?: ReactNode;
  destructive?: boolean;
  /** Couleurs recalculées à chaque rendu — préféré au spread iconColor/iconBg. */
  iconAccent?: MoreMenuIconAccent;
  iconColor?: string;
  iconBg?: string;
}

export function MoreMenuItem({
  icon: Icon,
  label,
  onPress,
  badge,
  trailing,
  destructive,
  iconAccent,
  iconColor,
  iconBg,
}: MoreMenuItemProps) {
  const c = useAppColors();
  const styles = useThemedStyles(buildMoreMenuStyles, 'MoreMenuItem');

  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const accent = iconAccent ? resolveMoreMenuIconColors(c, iconAccent) : null;
  const ic = iconColor ?? accent?.iconColor ?? (destructive ? c.error : c.primary);
  const ib = iconBg ?? accent?.iconBg ?? (destructive ? c.errorLight : c.primaryLight);

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
        style={styles.menuItem}
      >
        <Cluster
          gap={spacing[3]}
          leading={
            <View style={[styles.menuIconWrap, { backgroundColor: ib }]}>
              <Icon size={18} color={ic} strokeWidth={2} />
            </View>
          }
          actions={
            trailing ?? (
              badge != null && badge > 0 ? (
                <View style={styles.badge}>
                  <Animated.Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Animated.Text>
                </View>
              ) : (
                <ChevronRight
                  size={16}
                  color={destructive ? c.error : c.textTertiary}
                  strokeWidth={2}
                />
              )
            )
          }
        >
          <Animated.Text style={[styles.menuLabel, destructive && styles.menuLabelDestructive]}>
            {label}
          </Animated.Text>
        </Cluster>
      </Pressable>
    </Animated.View>
  );
}

export function buildMoreMenuStyles(c: AppColors) {
  return {
  section: { gap: spacing[2] },
  sectionTitle: {
    fontFamily: fontFamily.semiBold,
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
  menuItem: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexShrink: 0,
  },
  menuLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
    color: c.textPrimary,
  },
  menuLabelDestructive: { color: c.error },
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
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xs,
    color: c.textInverse,
  },
};
}
