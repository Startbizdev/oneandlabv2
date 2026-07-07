import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { ListRowShell } from '@/components/ui/ListRowShell';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import { radius, spacing, iconSize, AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  icon?: LucideIcon;
  /** Remplace l'icône (ex. avatar patient). */
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
  iconColor,
  iconBg,
  disabled = false,
  badge,
}: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'ProfileNavRow');

  const handlePress = () => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const leadingNode =
    leading ??
    (Icon ? (
      <View style={[styles.iconWrap, { backgroundColor: iconBg ?? c.primaryLight }]}>
        <Icon size={iconSize.mdSm} color={iconColor ?? c.primary} strokeWidth={2} />
      </View>
    ) : null);

  const titleNode = (
    <AppText style={styles.title} numberOfLines={1}>
      {title}
      {titleSuffix ? <AppText style={styles.titleSuffix}>{titleSuffix}</AppText> : null}
    </AppText>
  );

  return (
    <Pressable
      disabled={disabled}
      onPress={handlePress}
      onLongPress={onLongPress}
      delayLongPress={400}
      style={({ pressed }) => [pressed && !disabled && styles.rowPressed, disabled && styles.rowDisabled]}
    >
      <ListRowShell
        leading={leadingNode}
        body={
          <>
            {titleNode}
            {subtitle ? (
              <AppText style={styles.subtitle} numberOfLines={2}>
                {subtitle}
              </AppText>
            ) : null}
          </>
        }
        trailing={
          badge != null && badge > 0 ? (
            <View style={styles.badge}>
              <AppText style={styles.badgeText}>{badge > 99 ? '99+' : badge}</AppText>
            </View>
          ) : undefined
        }
        actions={<ChevronRight size={iconSize.mdSm} color={c.textTertiary} strokeWidth={2} />}
      />
    </Pressable>
  );
}

function buildStyles(c: AppColors) {
  return {
    rowPressed: {
      opacity: 0.92,
    },
    rowDisabled: {
      opacity: 0.55,
    },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
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
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      flexShrink: 0,
    },
    badgeText: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.xs,
      color: c.primary,
    },
  };
}
