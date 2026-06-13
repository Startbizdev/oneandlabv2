import type { AppColors } from '@/theme/colors';
import { useAppColors } from '@/theme/use-app-colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { elevation, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

export type FullWidthSegment<T extends string = string> = {
  id: T;
  label: string;
  Icon?: LucideIcon;
  badge?: number;
};

interface FullWidthSegmentBarProps<T extends string> {
  segments: FullWidthSegment<T>[];
  value: T;
  onChange: (id: T) => void;
  accessibilityRole?: 'tablist' | 'radiogroup';
}

/** Segmented control pleine largeur — source unique pour onglets mode / détail RDV. */
export function FullWidthSegmentBar<T extends string>({
  segments,
  value,
  onChange,
  accessibilityRole = 'tablist',
}: FullWidthSegmentBarProps<T>) {
  const c = useAppColors();
  const styles = useThemedStyles(buildFullWidthSegmentBarStyles, 'FullWidthSegmentBar');

  if (segments.length <= 1) return null;

  return (
    <View style={styles.track} accessibilityRole={accessibilityRole}>
      {segments.map((segment) => {
        const active = value === segment.id;
        const Icon = segment.Icon;
        const iconColor = active ? c.primary : c.textTertiary;

        return (
          <Pressable
            key={segment.id}
            onPress={() => onChange(segment.id)}
            style={[styles.tab, active && styles.tabActive]}
            accessibilityRole={accessibilityRole === 'tablist' ? 'tab' : 'radio'}
            accessibilityState={{ selected: active }}
            accessibilityLabel={segment.label}
          >
            {Icon ? <Icon size={16} color={iconColor} strokeWidth={2.25} /> : null}
            <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
              {segment.label}
            </Text>
            {segment.badge != null && segment.badge > 0 ? (
              <View style={[styles.badge, active && styles.badgeActive]}>
                <Text style={[styles.badgeText, active && styles.badgeTextActive]}>
                  {segment.badge > 99 ? '99+' : segment.badge}
                </Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

function buildFullWidthSegmentBarStyles(c: AppColors) {
  return {
    track: {
      minWidth: 0,
      flexDirection: 'row' as const,
      backgroundColor: c.surfaceAlt,
      borderRadius: radius.lg,
      padding: spacing[0.5] + 1,
      gap: spacing[0.5] + 1,
    },
    tab: {
      minWidth: 0,
      flex: 1,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: spacing[1.5],
      minHeight: spacing[10] + spacing[1],
      paddingVertical: spacing[2.5],
      paddingHorizontal: spacing[1.5],
      borderRadius: radius.md,
    },
    tabActive: {
      backgroundColor: c.surface,
      ...elevation.xs,
    },
    label: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.xs,
      color: c.textSecondary,
    },
    labelActive: {
      color: c.primaryDark,
    },
    badge: {
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      paddingHorizontal: spacing[1] + 1,
      backgroundColor: c.borderLight,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    badgeActive: {
      backgroundColor: c.primaryLight,
    },
    badgeText: {
      fontFamily: fontFamily.bold,
      fontSize: fontSize.xs,
      color: c.textSecondary,
    },
    badgeTextActive: {
      color: c.primary,
    },
  };
}

/** Slot optionnel pour contenu custom dans un segment (non utilisé par défaut). */
export function FullWidthSegmentIcon({
  children,
}: {
  children: ReactNode;
}) {
  return <>{children}</>;
}
