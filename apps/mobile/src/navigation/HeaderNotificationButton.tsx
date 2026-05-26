import type { ReactElement } from 'react';
import type { NativeStackHeaderRightProps } from '@react-navigation/native-stack';
import type { Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Bell } from 'lucide-react-native';
import { HeaderActionButton, type HeaderActionKind } from '@/navigation/HeaderActionButton';
import { getNotificationsPath } from '@/navigation/notifications-route';
import { useHeaderBellBadgeCount } from '@/navigation/use-header-bell-badge';
import { useAuthStore } from '@/store/auth-store';
import { colors, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

/** Cloche seule — `screenOptions.headerRight` des onglets principaux. */
export function tabHeaderNotificationRight(): () => ReactElement {
  return () => <HeaderNotificationBell />;
}

/** Marges horizontales : `AppHeader` (stacks) ou `headerRightContainerStyle` (onglets). */
export function HeaderNotificationBell() {
  const router = useRouter();
  const role = useAuthStore((s) => s.user?.role);
  const badgeCount = useHeaderBellBadgeCount();

  return (
    <Pressable
      onPress={() => router.push(getNotificationsPath(role))}
      hitSlop={8}
      style={styles.btn}
      accessibilityRole="button"
      accessibilityLabel="Notifications"
    >
      <Bell size={22} color={colors.primary} strokeWidth={2.25} />
      {badgeCount > 0 ? (
        <View style={styles.badge}>
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

const styles = StyleSheet.create({
  btn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  badgeText: {
    fontFamily: fontFamily.bold,
    fontSize: 9,
    color: colors.textInverse,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
});
