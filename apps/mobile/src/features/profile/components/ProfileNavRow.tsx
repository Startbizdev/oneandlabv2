import type { AppColors } from '@/theme/colors';
import { getThemedStyles } from '@/theme/use-themed-styles';
import { colors } from '@/theme';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import { radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  icon?: LucideIcon;
  /** Remplace l’icône (ex. avatar patient). */
  leading?: ReactNode;
  title: string;
  titleSuffix?: string;
  subtitle?: string;
  onPress: () => void;
  onLongPress?: () => void;
  iconColor?: string;
  iconBg?: string;
  disabled?: boolean;
  /** Pastille à droite (ex. nombre de RDV). */
  badge?: number;
}

export function ProfileNavRow({
  icon: Icon,
  leading,
  title,
  titleSuffix,
  subtitle,
  onPress,
  onLongPress,
  iconColor = colors.primary,
  iconBg = colors.primaryLight,
  disabled = false,
  badge,
}: Props) {
  return (
    <Pressable
      disabled={disabled}
      onPress={() => {
        if (disabled) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      onLongPress={onLongPress}
      delayLongPress={400}
      style={[styles.row, disabled && styles.rowDisabled]}
    >
      {leading ?? (
        Icon ? (
          <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
            <Icon size={18} color={iconColor} strokeWidth={2} />
          </View>
        ) : null
      )}
      <View style={styles.text}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
          {titleSuffix ? <Text style={styles.titleSuffix}>{titleSuffix}</Text> : null}
        </Text>
        {subtitle ? <Text style={styles.subtitle} numberOfLines={2}>{subtitle}</Text> : null}
      </View>
      {badge != null && badge > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      ) : null}
      <ChevronRight size={18} color={colors.textTertiary} strokeWidth={2} />
    </Pressable>
  );
}

function buildStyles(c: AppColors) {
  return {
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    width: '100%',
    gap: spacing[3],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
  },
  rowDisabled: {
    opacity: 0.55,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, gap: 2, minWidth: 0 },
  title: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
    color: c.textPrimary,
  },
  titleSuffix: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: c.textSecondary,
  },
  subtitle: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: c.textSecondary,
    lineHeight: fontSize.sm * 1.35,
  },
  badge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: radius.full,
    backgroundColor: c.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  badgeText: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: c.primary,
  },
};
}

const styles = new Proxy({} as Record<string, any>, {
  get(_target, prop: string | symbol) {
    if (typeof prop === 'string') {
      return getThemedStyles('features_profile_components_ProfileNavRow_tsx_styles', buildStyles)[prop];
    }
    return undefined;
  },
});
