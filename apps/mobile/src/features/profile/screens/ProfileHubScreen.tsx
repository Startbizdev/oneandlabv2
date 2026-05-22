import React, { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import {
  ChevronRight,
  User,
  FileText,
  Star,
  CalendarDays,
  Bell,
  CreditCard,
  LogOut,
  Users,
  Heart,
  Route,
  Scale,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { MoreProfileCard } from '@/features/profile/components/MoreProfileCard';
import { useAuthStore } from '@/store/auth-store';
import { getNotificationsPath } from '@/navigation/notifications-route';
import { roleRoutePrefix } from '@/navigation/role-route-prefix';
import { colors, elevation, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface MenuItemProps {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  destructive?: boolean;
  iconColor?: string;
  iconBg?: string;
}

function MenuItem({ icon: Icon, label, onPress, destructive, iconColor, iconBg }: MenuItemProps) {
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
        <ChevronRight size={16} color={destructive ? colors.error : colors.textTertiary} strokeWidth={2} />
      </Pressable>
    </Animated.View>
  );
}

interface MenuSection {
  title?: string;
  items: MenuItemProps[];
}

function getSections(
  role: string | undefined,
  router: ReturnType<typeof useRouter>,
  logout: () => Promise<void>,
): MenuSection[] {
  const navigate = (href: string) => router.push(href as never);
  const logoutAndRedirect = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  const common: MenuSection = {
    title: 'Compte',
    items: [
      {
        icon: User,
        label: 'Mon profil',
        onPress: () => navigate('/profile'),
      },
      ...(role === 'patient'
        ? [
            {
              icon: Bell,
              label: 'Notifications',
              onPress: () => router.push(getNotificationsPath('patient')),
            },
          ]
        : []),
    ],
  };

  const legalSection: MenuSection = {
    title: 'Informations',
    items: [
      {
        icon: Scale,
        label: 'Informations légales',
        onPress: () => navigate(`${roleRoutePrefix(role)}/informations-legales`),
        iconColor: '#64748B',
        iconBg: '#F1F5F9',
      },
    ],
  };

  const logoutSection: MenuSection = {
    items: [
      {
        icon: LogOut,
        label: 'Déconnexion',
        onPress: () => void logoutAndRedirect(),
        destructive: true,
      },
    ],
  };

  if (role === 'patient') {
    return [
      common,
      {
        title: 'Navigation',
        items: [
          { icon: CalendarDays, label: 'Mes rendez-vous', onPress: () => navigate('/(patient)/(tabs)/appointments') },
          { icon: CalendarDays, label: 'Réserver un RDV', onPress: () => navigate('/(patient)/(tabs)/book'), iconColor: '#0D9488', iconBg: '#F0FDFA' },
          { icon: Heart, label: 'Mes proches', onPress: () => navigate('/(patient)/(tabs)/relatives'), iconColor: '#DC2626', iconBg: '#FEF2F2' },
          { icon: Star, label: 'Mes avis', onPress: () => navigate('/(patient)/(tabs)/reviews'), iconColor: '#D97706', iconBg: '#FFFBEB' },
        ],
      },
      legalSection,
      logoutSection,
    ];
  }

  if (role === 'nurse') {
    return [
      common,
      {
        title: 'Professionnel',
        items: [
          { icon: Star, label: 'Mes avis', onPress: () => navigate('/(nurse)/reviews'), iconColor: '#D97706', iconBg: '#FFFBEB' },
          { icon: CreditCard, label: 'Abonnement', onPress: () => navigate('/(nurse)/abonnement'), iconColor: '#7C3AED', iconBg: '#F5F3FF' },
        ],
      },
      legalSection,
      logoutSection,
    ];
  }

  if (role === 'pro') {
    return [
      common,
      {
        title: 'Navigation',
        items: [
          { icon: Users, label: 'Mes patients', onPress: () => navigate('/(pro)/(tabs)/patients') },
          { icon: CalendarDays, label: 'Rendez-vous', onPress: () => navigate('/(pro)/(tabs)/appointments') },
        ],
      },
      legalSection,
      logoutSection,
    ];
  }

  if (role === 'preleveur') {
    return [
      common,
      {
        title: 'Navigation',
        items: [
          { icon: Route, label: 'Tournée', onPress: () => navigate('/(preleveur)/(tabs)/tournee'), iconColor: '#0D9488', iconBg: '#F0FDFA' },
          { icon: CalendarDays, label: 'Rendez-vous', onPress: () => navigate('/(preleveur)/(tabs)/index') },
        ],
      },
      legalSection,
      logoutSection,
    ];
  }

  return [common, legalSection, logoutSection];
}

export function ProfileHubScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.clearSession);

  const sections = getSections(user?.role, router, logout);

  const roleLabel: Record<string, string> = {
    nurse: 'Infirmier(ère)',
    patient: 'Patient',
    pro: 'Professionnel',
    preleveur: 'Préleveur',
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        <MoreProfileCard
          roleLabel={user?.role ? (roleLabel[user.role] ?? user.role) : 'Compte'}
          subtitle={user?.email ?? undefined}
          onPress={() => router.push('/profile')}
        />

        {/* Sections */}
        {sections.map((section, si) => (
          <Animated.View
            key={si}
            entering={FadeInDown.delay(150 + si * 60).duration(400).springify()}
            style={styles.section}
          >
            {section.title ? (
              <Animated.Text style={styles.sectionTitle}>{section.title}</Animated.Text>
            ) : null}
            <View style={[styles.sectionCard, elevation.xs]}>
              {section.items.map((item, ii) => (
                <React.Fragment key={ii}>
                  <MenuItem {...item} />
                  {ii < section.items.length - 1 ? (
                    <View style={styles.itemDivider} />
                  ) : null}
                </React.Fragment>
              ))}
            </View>
          </Animated.View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[8],
    gap: spacing[4],
  },
  section: {
    gap: spacing[2],
  },
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
  menuLabelDestructive: {
    color: colors.error,
  },
  itemDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginLeft: spacing[4] + 36 + spacing[3],
  },
});
