import { useState } from 'react';
import { View } from 'react-native';
import { TabSceneScrollView } from '@/components/navigation/TabSceneScrollView';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { LogOut, Scale, Settings, UserX } from 'lucide-react-native';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { SettingsSection } from '@/components/ui/SettingsSection';
import { buildHelpMoreItems } from '@/features/help/help-more-items';
import { MoreProfileCard } from '@/features/profile/components/MoreProfileCard';
import { PROFILE_SECURITY_MENU } from '@/features/profile/constants/profile-security-menu';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { useToast } from '@/providers/ToastProvider';
import { useAuthStore } from '@/store/auth-store';
import { spacing, useStyles, type Theme } from '@/theme';
import type { SettingsRowProps } from '@/components/ui/SettingsRow';

export type MoreTabSection = {
  title: string;
  items: SettingsRowProps[];
};

interface Props {
  roleLabel: string;
  /** Sections propres au rôle, affichées avant Compte / Aide / Légal. */
  sections: MoreTabSection[];
  /** Page « Informations légales » de la pile du rôle. */
  legalHref: string;
}

const SECTION_DELAY_START = 150;
const SECTION_DELAY_STEP = 60;

export function RoleMoreTabScreen({ roleLabel, sections, legalHref }: Props) {
  const styles = useStyles(buildStyles);
  const router = useRouter();
  const { show: toast } = useToast();
  const logout = useAuthStore((s) => s.clearSession);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const nav = (href: string) => router.push(href as never);

  const allSections: MoreTabSection[] = [
    ...sections,
    {
      title: 'Compte',
      items: [
        {
          icon: Settings,
          label: "Paramètres de l'app",
          onPress: () => nav('/profile/settings'),
          iconAccent: 'settings',
        },
        {
          icon: PROFILE_SECURITY_MENU.Icon,
          label: PROFILE_SECURITY_MENU.label,
          onPress: () => nav(PROFILE_SECURITY_MENU.href),
          iconAccent: PROFILE_SECURITY_MENU.iconAccent,
        },
        {
          icon: UserX,
          label: 'Supprimer mon compte',
          onPress: () => nav('/profile/delete-account'),
          destructive: true,
        },
      ],
    },
    { title: 'Aide', items: buildHelpMoreItems(nav) },
    {
      title: 'Légal',
      items: [
        {
          icon: Scale,
          label: 'Informations légales',
          onPress: () => nav(legalHref),
          iconAccent: 'muted',
        },
      ],
    },
  ];

  const confirmLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      setLogoutOpen(false);
      router.replace('/(auth)/welcome');
    } catch (e) {
      handleApiError(e, toast, 'logout', 'Déconnexion impossible. Réessayez.');
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <View style={styles.container}>
      <TabSceneScrollView
        contentContainerStyle={styles.scroll}
        scrollPaddingOptions={{ extraTop: spacing[4] }}
      >
        <MoreProfileCard roleLabel={roleLabel} onPress={() => router.push('/profile')} />

        {allSections.map((section, index) => (
          <Animated.View
            key={section.title}
            entering={FadeInDown.delay(SECTION_DELAY_START + index * SECTION_DELAY_STEP)
              .duration(400)
              .springify()}
          >
            <SettingsSection title={section.title} items={section.items} />
          </Animated.View>
        ))}

        <Animated.View
          entering={FadeInDown.delay(SECTION_DELAY_START + allSections.length * SECTION_DELAY_STEP)
            .duration(400)
            .springify()}
        >
          <SettingsSection
            items={[
              {
                icon: LogOut,
                label: 'Se déconnecter',
                destructive: true,
                onPress: () => setLogoutOpen(true),
              },
            ]}
          />
        </Animated.View>
      </TabSceneScrollView>

      <ConfirmSheet
        visible={logoutOpen}
        title="Se déconnecter ?"
        message="Vous devrez vous reconnecter pour accéder à votre compte sur cet appareil."
        confirmLabel="Se déconnecter"
        tone="destructive"
        loading={loggingOut}
        onConfirm={() => void confirmLogout()}
        onClose={() => setLogoutOpen(false)}
      />
    </View>
  );
}

function buildStyles({ colors: c }: Theme) {
  return {
    container: { minWidth: 0, flex: 1, backgroundColor: c.background },
    scroll: {
      paddingHorizontal: spacing[4],
      paddingBottom: spacing[10],
      gap: spacing[4],
    },
  };
}
