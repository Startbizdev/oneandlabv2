import { useAppColors } from '@/theme/use-app-colors';
import { Pressable, View, useWindowDimensions } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import {
  elevation,
  radius,
  spacing,
  iconSize,
  AppText,
  useStyles,
  font,
  ICON_STROKE_WIDTH,
  MIN_TOUCH_TARGET,
  type Theme,
} from '@/theme';

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
  accessibilityLabel?: string;
}

const LARGE_FONT_SCALE = 1.15;

/** Segmented control pleine largeur — source unique pour onglets mode / détail RDV. */
export function FullWidthSegmentBar<T extends string>({
  segments,
  value,
  onChange,
  accessibilityRole = 'tablist',
  accessibilityLabel,
}: FullWidthSegmentBarProps<T>) {
  const c = useAppColors();
  const styles = useStyles(buildFullWidthSegmentBarStyles);
  const { fontScale } = useWindowDimensions();
  // Grande police : l'icône passe au-dessus du libellé pour lui laisser toute la largeur (pas de mot coupé).
  const stacked = fontScale > LARGE_FONT_SCALE;

  if (segments.length <= 1) return null;

  return (
    <View style={styles.track} accessibilityRole={accessibilityRole} accessibilityLabel={accessibilityLabel}>
      {segments.map((segment) => {
        const active = value === segment.id;
        const Icon = segment.Icon;
        const iconColor = active ? c.primaryDark : c.textTertiary;

        return (
          <Pressable
            key={segment.id}
            onPress={() => onChange(segment.id)}
            style={[styles.tab, stacked && styles.tabStacked, active && styles.tabActive]}
            accessibilityRole={accessibilityRole === 'tablist' ? 'tab' : 'radio'}
            accessibilityState={{ selected: active }}
            accessibilityLabel={segment.label}
          >
            {Icon ? <Icon size={iconSize.sm} color={iconColor} strokeWidth={ICON_STROKE_WIDTH} /> : null}
            <AppText style={[styles.label, active && styles.labelActive]}>
              {segment.label}
            </AppText>
            {segment.badge != null && segment.badge > 0 ? (
              <View style={[styles.badge, active && styles.badgeActive]}>
                <AppText style={[styles.badgeText, active && styles.badgeTextActive]}>
                  {segment.badge > 99 ? '99+' : segment.badge}
                </AppText>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

function buildFullWidthSegmentBarStyles({ colors: c, fontSize, scale }: Theme) {
  return {
    track: {
      minWidth: 0,
      flexDirection: 'row' as const,
      backgroundColor: c.surfaceAlt,
      borderRadius: radius.lg,
      padding: spacing[0.5],
      gap: spacing[0.5],
    },
    tab: {
      minWidth: 0,
      flex: 1,
      flexBasis: 0,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: spacing[1.5],
      minHeight: scale(MIN_TOUCH_TARGET),
      paddingVertical: spacing[2],
      paddingHorizontal: spacing[1.5],
      borderRadius: radius.md,
    },
    tabStacked: {
      flexDirection: 'column' as const,
      gap: spacing[0.5],
    },
    tabActive: {
      backgroundColor: c.surface,
      ...elevation.xs,
    },
    label: {
      ...font.semiBold,
      fontSize: fontSize.xs,
      color: c.textSecondary,
      flexShrink: 1,
      textAlign: 'center' as const,
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
    },
    badgeActive: {
      backgroundColor: c.primaryLight,
    },
    badgeText: {
      ...font.bold,
      fontSize: fontSize.xs,
      color: c.textSecondary,
    },
    badgeTextActive: {
      color: c.primary,
    },
  };
}

