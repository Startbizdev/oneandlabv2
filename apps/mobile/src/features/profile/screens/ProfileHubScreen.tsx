import type { AppColors } from '@/theme/colors';
import { getAppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import React, { useCallback, useMemo } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import {
  buildTabSceneScrollConfig,
  spreadTabSceneScrollProps,
  useTabSceneInsets,
} from '@/components/navigation/liquid-glass-header-inset';
import { StackChromeScreen } from '@/navigation/StackChromeScreen';
import { Cluster } from '@/components/layout/primitives';
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
import { PROFILE_SECURITY_MENU } from '@/features/profile/constants/profile-security-menu';
import { MoreProfileCard } from '@/features/profile/components/MoreProfileCard';
import { useAuthStore } from '@/store/auth-store';
import { useAppPreferencesStore } from '@/store/app-preferences-store';
import { getNotificationsPath } from '@/navigation/notifications-route';
import { roleRoutePrefix } from '@/navigation/role-route-prefix';
import {elevation, radius, spacing, iconSize } from '@/theme';
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
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'ProfileHubScreen.MenuItem');
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const ic = iconColor ?? (destructive ? c.error : c.primary);
  const ib = iconBg ?? (destructive ? c.errorLight : c.primaryLight);

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
        <Cluster
          gap={spacing[3]}
          leading={
            <View style={[styles.menuIconWrap, { backgroundColor: ib }]}>
              <Icon size={iconSize.mdSm} color={ic} strokeWidth={2} />
            </View>
          }
          actions={
            <ChevronRight size={iconSize.sm} color={destructive ? c.error : c.textTertiary} strokeWidth={2} />
          }
        >
          <Animated.Text style={[styles.menuLabel, destructive && styles.menuLabelDestructive]}>
            {label}
          </Animated.Text>
        </Cluster>
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
  const c = getAppColors();
  const menuIcons = {
    teal: { iconColor: c.primary, iconBg: c.primaryLight },
    heart: { iconColor: c.error, iconBg: c.errorLight },
    warning: { iconColor: c.warning, iconBg: c.warningLight },
    muted: { iconColor: c.textSecondary, iconBg: c.surfaceAlt },
  };

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
      {
        icon: PROFILE_SECURITY_MENU.Icon,
        label: PROFILE_SECURITY_MENU.label,
        onPress: () => navigate(PROFILE_SECURITY_MENU.href),
        ...menuIcons.teal,
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
        ...menuIcons.muted,
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
          { icon: CalendarDays, label: 'Réserver un RDV', onPress: () => navigate('/(patient)/(tabs)/book'), ...menuIcons.teal },
          { icon: Heart, label: 'Mes proches', onPress: () => navigate('/(patient)/(tabs)/relatives'), ...menuIcons.heart },
          { icon: Star, label: 'Mes avis', onPress: () => navigate('/(patient)/reviews'), ...menuIcons.warning },
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
          { icon: Star, label: 'Mes avis', onPress: () => navigate('/(nurse)/reviews'), ...menuIcons.warning },
          {
            icon: CreditCard,
            label: 'Abonnement',
            onPress: () => navigate('/(nurse)/abonnement'),
            ...menuIcons.warning,
          },
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
          { icon: Route, label: 'Tournée', onPress: () => navigate('/(preleveur)/(tabs)/tournee'), ...menuIcons.teal },
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
  const styles = useThemedStyles(buildStyles, 'features_profile_screens_ProfileHubScreen_tsx_styles');
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.clearSession);
  const colorblindType = useAppPreferencesStore((s) => s.colorblindType);

  const sections = useMemo(
    () => getSections(user?.role, router, logout),
    [user?.role, router, logout, colorblindType],
  );
  const sceneInsets = useTabSceneInsets();
  const scrollConfig = buildTabSceneScrollConfig(sceneInsets, styles.scroll);

  const roleLabel: Record<string, string> = {
    nurse: 'Infirmier(ère)',
    patient: 'Patient',
    pro: 'Professionnel',
    preleveur: 'Préleveur',
  };

  return (
    <StackChromeScreen>
      <ScrollView
        {...spreadTabSceneScrollProps(scrollConfig)}
        contentContainerStyle={scrollConfig.contentContainerStyle}
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
    </StackChromeScreen>
  );
}

function buildStyles(c: AppColors) {
  return {
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
    color: c.textTertiary,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
    paddingHorizontal: spacing[1],
  },
  sectionCard: {
    backgroundColor: c.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: c.borderLight,
    overflow: 'hidden' as const,
  },
  menuItem: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexShrink: 0,
  },
  menuLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
    color: c.textPrimary,
  },
  menuLabelDestructive: {
    color: c.error,
  },
  itemDivider: {
    height: 1,
    alignSelf: 'stretch' as const,
    backgroundColor: c.borderLight,
  },
  };
}

