import { useRouter } from 'expo-router';
import { SettingsSection } from '@/components/ui/SettingsSection';
import { PROFILE_SECURITY_MENU } from '@/features/profile/constants/profile-security-menu';

/** Lien « Mot de passe et connexion » en bas de « Mon profil ». */
export function ProfileSecurityLinkRow() {
  const router = useRouter();

  return (
    <SettingsSection
      title="Compte"
      items={[
        {
          icon: PROFILE_SECURITY_MENU.Icon,
          label: PROFILE_SECURITY_MENU.label,
          onPress: () => router.push(PROFILE_SECURITY_MENU.href),
        },
      ]}
    />
  );
}
