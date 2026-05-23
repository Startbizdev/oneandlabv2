import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { ChevronRight } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { colors, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

export interface MoreMenuItemProps {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  badge?: number;
  destructive?: boolean;
  iconColor?: string;
  iconBg?: string;
}

export function MoreMenuItem({
  icon: Icon,
  label,
  onPress,
  badge,
  destructive,
  iconColor,
  iconBg,
}: MoreMenuItemProps) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const ic = iconColor ?? (destructive ? colors.error : colors.primary);
  const ib = iconBg ?? (destructive ? colors.errorLight : colors.primaryLight);

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
        <View style={[styles.menuIconWrap, { backgroundColor: ib }]}>
          <Icon size={18} color={ic} strokeWidth={2} />
        </View>
        <Animated.Text style={[styles.menuLabel, destructive && styles.menuLabelDestructive]}>
          {label}
        </Animated.Text>
        {badge != null && badge > 0 ? (
          <View style={styles.badge}>
            <Animated.Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Animated.Text>
          </View>
        ) : (
          <ChevronRight
            size={16}
            color={destructive ? colors.error : colors.textTertiary}
            strokeWidth={2}
          />
        )}
      </Pressable>
    </Animated.View>
  );
}

export const moreMenuStyles = StyleSheet.create({
  section: { gap: spacing[2] },
  sectionTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    paddingHorizontal: spacing[1],
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[3],
  },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  menuLabel: {
    flex: 1,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
    color: colors.textPrimary,
  },
  menuLabelDestructive: { color: colors.error },
  divider: {
    height: 1,
    alignSelf: 'stretch',
    backgroundColor: colors.borderLight,
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: radius.full,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[1],
  },
  badgeText: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    color: colors.textInverse,
  },
});

const styles = moreMenuStyles;
