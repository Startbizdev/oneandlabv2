import React from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import {
  Bell,
  CalendarPlus,
  ChevronRight,
  CreditCard,
  LogOut,
  Scale,
  Share2,
  ScanFace,
  Star,
  User,
} from 'lucide-react-native';
import { webAppUrl } from '@/config/env';
import { fetchUser } from '@/features/profile/api/profile.service';
import { queryKeys } from '@/lib/query-keys';
import type { LucideIcon } from 'lucide-react-native';
import { useUnreadNotificationsCount } from '@/features/notifications/hooks/use-unread-count';
import { MoreProfileCard } from '@/features/profile/components/MoreProfileCard';
import { useAuthStore } from '@/store/auth-store';
import { getNotificationsPath } from '@/navigation/notifications-route';
import { colors, elevation, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface MenuItemProps {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  badge?: number;
  destructive?: boolean;
  iconColor?: string;
  iconBg?: string;
}

function MenuItem({ icon: Icon, label, onPress, badge, destructive, iconColor, iconBg }: MenuItemProps) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const ic = iconColor ?? (destructive ? colors.error : colors.primary);
  const ib = iconBg ?? (destructive ? colors.errorLight : colors.primaryLight);

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPressIn={() => { scale.value = withSpring(0.97, { damping: 20, stiffness: 400 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 18, stiffness: 300 }); }}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        style={styles.menuItem}
      >
        <View style={[styles.menuIconWrap, { backgroundColor: ib }]}>
          <Icon size={18} color={ic} strokeWidth={2} />
        </View>
        <Animated.Text style={[styles.menuLabel, destructive && styles.menuLabelDestructive]}>
          {label}
        </Animated.Text>
        {badge != null && badge > 0 ? (
          <View style={styles.badge}>
            <Animated.Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Animated.Text>
          </View>
        ) : (
          <ChevronRight size={16} color={destructive ? colors.error : colors.textTertiary} strokeWidth={2} />
        )}
      </Pressable>
    </Animated.View>
  );
}

export default function NurseMore() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.clearSession);
  const unread = useUnreadNotificationsCount();

  const profileQ = useQuery({
    queryKey: queryKeys.profile.user(user?.id ?? ''),
    queryFn: async () => (await fetchUser(user!.id)).data,
    enabled: !!user?.id,
  });

  const publicSlug = profileQ.data?.public_slug?.trim() ?? '';
  const publicProfileEnabled =
    profileQ.data?.is_public_profile_enabled !== false &&
    profileQ.data?.is_public_profile_enabled !== 0;

  const sharePublicProfile = async () => {
    if (!publicSlug || !publicProfileEnabled) {
      Alert.alert(
        'Profil public indisponible',
        'Activez votre profil public et définissez un lien dans Mon profil pour partager votre fiche.',
      );
      return;
    }
    const url = webAppUrl(`/infirmier/${publicSlug}`);
    const message =
      `Voici mon profil Cary — si vous souhaitez prendre rendez-vous, cliquez sur le lien : ${url}`;
    await Share.share({ message, url });
  };

  const nav = (href: string) => router.push(href as never);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        <MoreProfileCard
          roleLabel="Infirmier(ère)"
          onPress={() => nav('/profile')}
        />

        {/* Actions */}
        <Animated.View entering={FadeInDown.delay(150).duration(400).springify()} style={styles.section}>
          <Animated.Text style={styles.sectionTitle}>Actions</Animated.Text>
          <View style={[styles.sectionCard, elevation.xs]}>
            <MenuItem
              icon={CalendarPlus}
              label="Nouveau rendez-vous"
              onPress={() => nav('/(nurse)/appointments/new')}
              iconColor="#0D9488"
              iconBg="#F0FDFA"
            />
          </View>
        </Animated.View>

        {/* Professionnel */}
        <Animated.View entering={FadeInDown.delay(210).duration(400).springify()} style={styles.section}>
          <Animated.Text style={styles.sectionTitle}>Professionnel</Animated.Text>
          <View style={[styles.sectionCard, elevation.xs]}>
            <MenuItem icon={User} label="Mon profil" onPress={() => nav('/profile')} />
            <View style={styles.divider} />
            <MenuItem
              icon={Share2}
              label="Partager mon profil"
              onPress={() => void sharePublicProfile()}
              iconColor="#0D9488"
              iconBg="#F0FDFA"
            />
            <View style={styles.divider} />
            <MenuItem
              icon={Star}
              label="Mes avis"
              onPress={() => nav('/(nurse)/reviews')}
              iconColor="#D97706"
              iconBg="#FFFBEB"
            />
            <View style={styles.divider} />
            <MenuItem
              icon={CreditCard}
              label="Abonnement"
              onPress={() => nav('/(nurse)/abonnement')}
              iconColor="#7C3AED"
              iconBg="#F5F3FF"
            />
          </View>
        </Animated.View>

        {/* Paramètres */}
        <Animated.View entering={FadeInDown.delay(270).duration(400).springify()} style={styles.section}>
          <Animated.Text style={styles.sectionTitle}>Paramètres</Animated.Text>
          <View style={[styles.sectionCard, elevation.xs]}>
            <MenuItem
              icon={Bell}
              label="Notifications"
              onPress={() => router.push(getNotificationsPath('nurse'))}
              badge={unread}
            />
            <View style={styles.divider} />
            <MenuItem
              icon={ScanFace}
              label="Face ID"
              onPress={() => nav('/profile/security')}
              iconColor="#0D9488"
              iconBg="#F0FDFA"
            />
            <View style={styles.divider} />
            <MenuItem
              icon={Scale}
              label="Informations légales"
              onPress={() => nav('/(nurse)/informations-legales')}
              iconColor="#64748B"
              iconBg="#F1F5F9"
            />
          </View>
        </Animated.View>

        {/* Déconnexion */}
        <Animated.View entering={FadeInDown.delay(330).duration(400).springify()} style={styles.section}>
          <View style={[styles.sectionCard, elevation.xs]}>
            <MenuItem
              icon={LogOut}
              label="Déconnexion"
              destructive
              onPress={async () => {
                await logout();
                router.replace('/(auth)/login');
              }}
            />
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[8],
    gap: spacing[4],
    paddingTop: spacing[4],
  },
  section: { gap: spacing[2] },
  sectionTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    paddingHorizontal: spacing[1],
  },
  sectionCard: {
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
    paddingVertical: spacing[3],
    gap: spacing[3],
  },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  menuLabel: {
    flex: 1,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
    color: colors.textPrimary,
  },
  menuLabelDestructive: { color: colors.error },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginLeft: spacing[4] + 36 + spacing[3],
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: radius.full,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[1],
  },
  badgeText: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    color: colors.textInverse,
  },
});
