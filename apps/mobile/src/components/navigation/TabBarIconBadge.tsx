import type { AppColors } from '@/theme/colors';
import { getThemedStyles } from '@/theme/use-themed-styles';
import { colors } from '@/theme';
import { StyleSheet, Text, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  Icon: LucideIcon;
  color: string;
  size?: number;
  strokeWidth?: number;
  /** Nombre affiché ; 0 = pas de pastille. */
  badge?: number;
}

/**
 * Icône d’onglet + pastille (intégrée dans tabBarIcon).
 */
export function TabBarIconBadge({
  Icon,
  color,
  size = 21,
  strokeWidth = 2,
  badge = 0,
}: Props) {
  const showDot = badge > 0 && badge < 10;
  const label = badge > 99 ? '99+' : String(badge);

  return (
    <View style={styles.wrap}>
      <Icon color={color} size={size} strokeWidth={strokeWidth} />
      {badge > 0 ? (
        showDot ? (
          <View style={styles.dot} />
        ) : (
          <View style={[styles.badge, label.length > 1 && styles.badgeWide]}>
            <Text style={styles.badgeText}>{label}</Text>
          </View>
        )
      ) : null}
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
  wrap: {
    width: 28,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: c.error,
    borderWidth: 1.5,
    borderColor: c.surface,
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: -10,
    minWidth: 17,
    height: 17,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: c.error,
    borderWidth: 2,
    borderColor: c.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeWide: {
    minWidth: 22,
    right: -14,
  },
  badgeText: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xs,
    lineHeight: fontSize.xs * 1.15,
    color: c.textInverse,
  },
};
}

const styles = new Proxy({} as Record<string, any>, {
  get(_target, prop: string | symbol) {
    if (typeof prop === 'string') {
      return getThemedStyles('components_navigation_TabBarIconBadge_tsx_styles', buildStyles)[prop];
    }
    return undefined;
  },
});
