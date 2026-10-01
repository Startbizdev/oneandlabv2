import { useState } from 'react';
import { View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { HelpCircle, LifeBuoy, LogOut, Scale, Settings, UserX } from 'lucide-react-native';
import { SceneScrollView } from '@/components/navigation/SceneScrollView';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { SettingsSection } from '@/components/ui/SettingsSection';
import type { SettingsRowProps } from '@/components/ui/SettingsRow';
import { LOGIN_HREF } from '@/features/auth/hooks/use-auth-guard';
import { MoreProfileCard } from '@/features/profile/components/MoreProfileCard';
import { PROFILE_SECURITY_MENU } from '@/features/profile/constants/profile-security-menu';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { useToast } from '@/providers/ToastProvider';
import { useAuthStore } from '@/store/auth-store';
import { spacing, useStyles, type Theme } from '@/theme';

export type MoreTabSection = {
  title: string;
  items: SettingsRowProps[];
};

interface Props {
  roleLabel: string;
  /** Sections propres au rôle, affichées avant Réglages et Aide. */
  sections: MoreTabSection[];
  /** Page « Informations légales » de la pile du rôle. */
  legalHref: Href;
}

/** Onglet « Plus » commun aux rôles : liste de réglages groupée, déconnexion et suppression du compte en dernier. */
export function RoleMoreTabScreen({ roleLabel, sections, legalHref }: Props) {
  const styles = useStyles(buildStyles);
  const router = useRouter();
  const { show: toast } = useToast();
  const logout = useAuthStore((s) => s.clearSession);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const nav = (href: Href) => router.push(href);

  const allSections: MoreTabSection[] = [
    ...sections.filter((section) => section.items.length > 0),
    {
      title: 'Réglages',
      items: [
        { icon: Settings, label: 'Paramètres', onPress: () => nav('/profile/settings') },
        {
          icon: PROFILE_SECURITY_MENU.Icon,
          label: PROFILE_SECURITY_MENU.label,
          onPress: () => nav(PROFILE_SECURITY_MENU.href),
        },
      ],
    },
    {
      title: 'Aide',
      items: [
        { icon: HelpCircle, label: "Centre d'aide", onPress: () => nav('/profile/help') },
        { icon: LifeBuoy, label: 'Contacter le support', onPress: () => nav('/profile/support') },
        { icon: Scale, label: 'Informations légales', onPress: () => nav(legalHref) },
      ],
    },
  ];

  const confirmLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      setLogoutOpen(false);
      router.replace(LOGIN_HREF);
    } catch (e) {
      handleApiError(e, toast, 'logout', 'Déconnexion impossible. Réessayez.');
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <View style={styles.container}>
      <SceneScrollView contentContainerStyle={styles.scroll}>
        <MoreProfileCard roleLabel={roleLabel} onPress={() => router.push('/profile')} />

        {allSections.map((section) => (
          <SettingsSection key={section.title} title={section.title} items={section.items} />
        ))}

        <SettingsSection
          items={[
            {
              icon: LogOut,
              label: 'Se déconnecter',
              destructive: true,
              inlineAction: true,
              onPress: () => setLogoutOpen(true),
            },
            {
              icon: UserX,
              label: 'Supprimer mon compte',
              onPress: () => nav('/profile/delete-account'),
              destructive: true,
            },
          ]}
        />
      </SceneScrollView>

      <ConfirmSheet
        visible={logoutOpen}
        title="Se déconnecter ?"
        message="Vous devrez vous reconnecter sur cet appareil."
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
      paddingTop: spacing[4],
      paddingBottom: spacing[10],
      gap: spacing[6],
    },
  };
}
