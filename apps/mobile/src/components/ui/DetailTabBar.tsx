import type { AppColors } from '@/theme/colors';
import { useAppColors } from '@/theme/use-app-colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { Pressable, Text, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Row } from '@/components/layout/primitives';
import { radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

export type DetailTabBarItem<T extends string = string> = {
  id: T;
  label: string;
  Icon?: LucideIcon;
  badge?: number;
};

interface DetailTabBarProps<T extends string> {
  tabs: DetailTabBarItem<T>[];
  value: T;
  onChange: (id: T) => void;
  accessibilityLabel?: string;
}

/**
 * Onglets fiche RDV — aligné sur `BookingAvailabilitySection` + squelette `SkeletonSegmentBar`.
 */
export function DetailTabBar<T extends string>({
  tabs,
  value,
  onChange,
  accessibilityLabel = 'Sections',
}: DetailTabBarProps<T>) {
  const c = useAppColors();
  const styles = useThemedStyles(buildDetailTabBarStyles, 'DetailTabBar');

  if (tabs.length <= 1) return null;

  return (
    <View
      style={styles.host}
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
    >
      <View style={styles.shell}>
        {tabs.map((tab) => {
          const active = value === tab.id;
          const Icon = tab.Icon;
          const iconColor = active ? c.primaryDark : c.textTertiary;

          return (
            <Pressable
              key={tab.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={tab.label}
              onPress={() => onChange(tab.id)}
              style={[styles.tab, active && styles.tabActive]}
            >
              <Row gap={spacing[1.5]} align="center" justify="center" style={styles.tabContent}>
                {Icon ? (
                  <Icon size={15} color={iconColor} strokeWidth={2.2} />
                ) : null}
                <Text
                  style={[styles.label, active && styles.labelActive]}
                  numberOfLines={1}
                >
                  {tab.label}
                </Text>
                {tab.badge != null && tab.badge > 0 ? (
                  <View style={[styles.badge, active && styles.badgeActive]}>
                    <Text style={[styles.badgeText, active && styles.badgeTextActive]}>
                      {tab.badge > 99 ? '99+' : tab.badge}
                    </Text>
                  </View>
                ) : null}
              </Row>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function buildDetailTabBarStyles(c: AppColors) {
  return {
    host: {
      width: '100%' as const,
      alignSelf: 'stretch' as const,
    },
    shell: {
      width: '100%' as const,
      flexDirection: 'row' as const,
      gap: spacing[1],
      padding: spacing[0.5],
      borderRadius: radius.lg,
      backgroundColor: c.surfaceSubtle,
    },
    tab: {
      flex: 1,
      flexBasis: 0,
      minWidth: 0,
      minHeight: 40,
      borderRadius: radius.md,
      paddingHorizontal: spacing[1.5],
      paddingVertical: spacing[2],
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    tabActive: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.primaryMid,
    },
    tabContent: {
      minWidth: 0,
      flexShrink: 1,
    },
    label: {
      flexShrink: 1,
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.xs,
      color: c.textTertiary,
    },
    labelActive: {
      color: c.primaryDark,
    },
    badge: {
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      paddingHorizontal: spacing[1],
      backgroundColor: c.borderLight,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      flexShrink: 0,
    },
    badgeActive: {
      backgroundColor: c.primaryLight,
    },
    badgeText: {
      fontFamily: fontFamily.bold,
      fontSize: 10,
      color: c.textSecondary,
    },
    badgeTextActive: {
      color: c.primary,
    },
  };
}
