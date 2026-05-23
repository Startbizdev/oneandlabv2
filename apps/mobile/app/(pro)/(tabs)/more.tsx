import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Bell, LogOut, Scale, ScanFace, User } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { useUnreadNotificationsCount } from '@/features/notifications/hooks/use-unread-count';
import { MoreProfileCard } from '@/features/profile/components/MoreProfileCard';
import { useBiometricLabel } from '@/features/profile/hooks/use-biometric-label';
import { getNotificationsPath } from '@/navigation/notifications-route';
import { useAuthStore } from '@/store/auth-store';
import { colors, elevation, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

export default function ProMore() {
  const router = useRouter();
  const biometricLabel = useBiometricLabel('Biométrie');
  const logout = useAuthStore((s) => s.clearSession);
  const user = useAuthStore((s) => s.user);
  const unread = useUnreadNotificationsCount();

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        <MoreProfileCard
          roleLabel="Professionnel de santé"
          subtitle={user?.email ?? undefined}
          onPress={() => router.push('/profile')}
          delay={0}
        />

        <Animated.View entering={FadeInDown.delay(80).duration(280).springify()} style={[styles.section, elevation.xs]}>
          <View style={styles.menuItem}>
            <View style={styles.menuIcon}><User size={18} color={colors.primary} strokeWidth={2} /></View>
            <Button title="Mon profil" variant="ghost" onPress={() => router.push('/profile')} />
          </View>
          <View style={styles.divider} />
          <View style={styles.menuItem}>
            <View style={styles.menuIcon}><Bell size={18} color={colors.primary} strokeWidth={2} /></View>
            <Button title="Notifications" variant="ghost" onPress={() => router.push(getNotificationsPath('pro'))} />
            {unread > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text>
              </View>
            ) : null}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(120).duration(280).springify()} style={[styles.section, elevation.xs]}>
          <View style={styles.menuItem}>
            <View style={[styles.menuIcon, { backgroundColor: '#F0FDFA' }]}>
              <ScanFace size={18} color="#0D9488" strokeWidth={2} />
            </View>
            <Button title={biometricLabel} variant="ghost" onPress={() => router.push('/profile/security' as never)} />
          </View>
          <View style={styles.divider} />
          <View style={styles.menuItem}>
            <View style={[styles.menuIcon, { backgroundColor: '#F1F5F9' }]}>
              <Scale size={18} color="#64748B" strokeWidth={2} />
            </View>
            <Button
              title="Informations légales"
              variant="ghost"
              onPress={() => router.push('/(pro)/informations-legales' as never)}
            />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(160).duration(280).springify()}>
          <Button
            title="Déconnexion"
            variant="destructive"
            leftIcon={<LogOut size={16} color={colors.error} strokeWidth={2} />}
            onPress={async () => {
              await logout();
              router.replace('/(auth)/login');
            }}
            fullWidth
          />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: {
    padding: spacing[4],
    gap: spacing[3],
    paddingBottom: spacing[10],
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[1],
  },
  menuIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    alignSelf: 'stretch',
    backgroundColor: colors.borderLight,
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: radius.full,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[1],
    marginRight: spacing[2],
  },
  badgeText: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    color: colors.textInverse,
  },
});
