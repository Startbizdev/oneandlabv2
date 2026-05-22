import { StyleSheet, Text, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { colors } from '@/theme';
import { fontFamily } from '@/theme/typography';

interface Props {
  Icon: LucideIcon;
  color: string;
  size?: number;
  strokeWidth?: number;
  /** Nombre affiché ; 0 = pas de pastille. */
  badge?: number;
}

/**
 * Icône d’onglet + pastille (pattern recommandé React Navigation :
 * le badge vit dans tabBarIcon, pas via overflow sur la tab bar).
 */
export function TabBarIconBadge({
  Icon,
  color,
  size = 22,
  strokeWidth = 2,
  badge = 0,
}: Props) {
  const label = badge > 99 ? '99+' : String(badge);

  return (
    <View style={styles.wrap}>
      <Icon color={color} size={size} strokeWidth={strokeWidth} />
      {badge > 0 ? (
        <View style={[styles.badge, label.length > 1 && styles.badgeWide]}>
          <Text style={styles.badgeText}>{label}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 28,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -8,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: colors.error,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeWide: {
    minWidth: 24,
    right: -12,
  },
  badgeText: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    lineHeight: 12,
    color: colors.textInverse,
  },
});
