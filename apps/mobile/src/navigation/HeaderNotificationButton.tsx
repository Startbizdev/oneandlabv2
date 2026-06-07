import type { AppColors } from '@/theme/colors';
import { getThemedStyles } from '@/theme/use-themed-styles';
import { colors } from '@/theme';
import type { ReactElement } from 'react';
import type { Href } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Bell } from 'lucide-react-native';
import { HeaderActionButton, type HeaderActionKind } from '@/navigation/HeaderActionButton';
import { getNotificationsPath } from '@/navigation/notifications-route';
import { useHeaderBellBadgeCount } from '@/navigation/use-header-bell-badge';
import { useAuthStore } from '@/store/auth-store';
import { spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

const BELL_SIZE = 44;
const BELL_ICON = 22;

/** Cloche seule — `screenOptions.headerRight` des onglets principaux. */
export function tabHeaderNotificationRight(): () => ReactElement {
  return () => <HeaderNotificationBell />;
}

/** Cloche — cercle blanc, ombre légère, icône primary. */
export function HeaderNotificationBell() {
  const router = useRouter();
  const role = useAuthStore((s) => s.user?.role);
  const badgeCount = useHeaderBellBadgeCount();
  const showBadge = badgeCount > 0;

  return (
    <Pressable
      onPress={() => router.push(getNotificationsPath(role))}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel={
        showBadge
          ? `Notifications, ${badgeCount > 99 ? 'plus de 99' : badgeCount} non lues`
          : 'Notifications'
      }
      style={({ pressed }) => [styles.host, pressed && styles.pressed]}
    >
      <View style={styles.circle}>
        <Bell size={BELL_ICON} color={colors.primary} strokeWidth={2.25} />
      </View>
      {showBadge ? (
        <View style={styles.badge} pointerEvents="none">
          <Text style={styles.badgeText}>{badgeCount > 99 ? '99+' : badgeCount}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

/** Cloche + action optionnelle à droite du header. */
export function HeaderBarActions({
  action,
}: {
  action?: ReactElement | null;
}) {
  return (
    <View style={styles.row}>
      <HeaderNotificationBell />
      {action}
    </View>
  );
}

export function headerBarWithAction(action: ReactElement | null) {
  return () => <HeaderBarActions action={action} />;
}

/** Cloche + bouton d’action (Nouveau / Réserver) pour les onglets RDV. */
export function headerBarRightAction(
  kind: HeaderActionKind,
  opts: { href?: Href; onPress?: () => void } = {},
) {
  return () => (
    <HeaderBarActions
      action={
        <HeaderActionButton
          kind={kind}
          href={opts.href}
          onPress={opts.onPress}
          embedded
        />
      }
    />
  );
}

const BADGE = 18;

function buildStyles(c: AppColors) {
  return {
  host: {
    width: BELL_SIZE + 8,
    height: BELL_SIZE + 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.96 }],
  },
  circle: {
    width: BELL_SIZE,
    height: BELL_SIZE,
    borderRadius: BELL_SIZE / 2,
    backgroundColor: c.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.14,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: BADGE,
    height: BADGE,
    borderRadius: BADGE / 2,
    paddingHorizontal: 4,
    backgroundColor: c.error,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: c.surface,
  },
  badgeText: {
    fontFamily: fontFamily.extraBold,
    fontSize: fontSize.xs,
    lineHeight: fontSize.xs * 1.15,
    color: c.textInverse,
    includeFontPadding: false,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2.5],
  },
};
}

const styles = new Proxy({} as Record<string, any>, {
  get(_target, prop: string | symbol) {
    if (typeof prop === 'string') {
      return getThemedStyles('navigation_HeaderNotificationButton_tsx_styles', buildStyles)[prop];
    }
    return undefined;
  },
});
