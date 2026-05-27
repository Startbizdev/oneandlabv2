import type { ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, elevation, radius } from '@/theme';
import { fontFamily } from '@/theme/typography';
import {
  APP_HEADER_ORB_ICON,
  APP_HEADER_ORB_SIZE,
  APP_HEADER_ORB_STROKE,
} from './header-layout';

interface Props {
  onPress: () => void;
  accessibilityLabel: string;
  children: ReactNode;
  badgeCount?: number;
  /** Retour : anneau verre + icône brand. Cloche : orb gradient plein. */
  variant?: 'gradient' | 'glass';
}

/**
 * Bouton header premium — orb gradient ou verre, badge notif hors du bouton.
 */
export function HeaderGradientOrbButton({
  onPress,
  accessibilityLabel,
  children,
  badgeCount = 0,
  variant = 'gradient',
}: Props) {
  const showBadge = badgeCount > 0;

  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.host, pressed && styles.pressed]}
    >
      {variant === 'glass' ? (
        <View style={styles.glassRing}>
          <LinearGradient
            colors={[colors.gradientStart, colors.primary, colors.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.glassRingGradient}
          />
          <View style={styles.glassInner}>{children}</View>
        </View>
      ) : (
        <LinearGradient
          colors={[colors.gradientStart, colors.primary, colors.gradientEnd]}
          locations={[0, 0.45, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.orb}
        >
          <View style={styles.orbHighlight} pointerEvents="none" />
          {children}
        </LinearGradient>
      )}

      {showBadge ? (
        <View style={styles.badgeAnchor} pointerEvents="none">
          <LinearGradient
            colors={['#FF5A5F', colors.error]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.badge}
          >
            <Text style={styles.badgeText}>{badgeCount > 99 ? '99+' : badgeCount}</Text>
          </LinearGradient>
        </View>
      ) : null}
    </Pressable>
  );
}

export function HeaderOrbIconSize() {
  return APP_HEADER_ORB_ICON;
}

export function HeaderOrbIconStroke() {
  return APP_HEADER_ORB_STROKE;
}

const BADGE_SIZE = 20;

const styles = StyleSheet.create({
  host: {
    width: APP_HEADER_ORB_SIZE,
    height: APP_HEADER_ORB_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.94 }],
  },
  orb: {
    width: APP_HEADER_ORB_SIZE,
    height: APP_HEADER_ORB_SIZE,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: colors.gradientEnd,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.22,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
  orbHighlight: {
    position: 'absolute',
    top: 3,
    left: 5,
    right: 5,
    height: 10,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  glassRing: {
    width: APP_HEADER_ORB_SIZE,
    height: APP_HEADER_ORB_SIZE,
    borderRadius: radius.lg,
    padding: 1.5,
    ...elevation.sm,
    shadowColor: colors.gradientEnd,
    shadowOpacity: 0.2,
  },
  glassRingGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.lg,
  },
  glassInner: {
    flex: 1,
    borderRadius: radius.lg - 1,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeAnchor: {
    position: 'absolute',
    top: -2,
    right: -2,
    zIndex: 20,
    ...Platform.select({
      ios: {
        shadowColor: colors.error,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.45,
        shadowRadius: 4,
      },
      android: { elevation: 8 },
    }),
  },
  badge: {
    minWidth: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_SIZE / 2,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: colors.surface,
  },
  badgeText: {
    fontFamily: fontFamily.extraBold,
    fontSize: 10,
    lineHeight: 12,
    color: colors.textInverse,
    includeFontPadding: false,
  },
});
