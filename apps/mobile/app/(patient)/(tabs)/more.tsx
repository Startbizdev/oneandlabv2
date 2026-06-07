import { useRouter } from 'expo-router';
import { Bell, FileText, FlaskConical, Scale, ScanFace, Settings, Star, User } from 'lucide-react-native';
import { buildHelpMoreItems } from '@/features/help/help-more-items';
import { useBiometricLabel } from '@/features/profile/hooks/use-biometric-label';
import { TabScreenShell } from '@/components/navigation/TabScreenShell';
import { RoleMoreTabScreen } from '@/features/profile/screens/RoleMoreTabScreen';
import { useUnreadNotificationsCount } from '@/features/notifications/hooks/use-unread-count';
import { getNotificationsPath } from '@/navigation/notifications-route';

export default function PatientMore() {
  const router = useRouter();
  const biometricLabel = useBiometricLabel('Biométrie');
  const unread = useUnreadNotificationsCount();

  const nav = (href: string) => router.navigate(href as never);

  return (
    <TabScreenShell>
      <RoleMoreTabScreen
        roleLabel="Patient"
        sections={[
          {
            title: 'Mon compte',
            delay: 150,
            items: [
              { icon: User, label: 'Mon profil', onPress: () => nav('/profile') },
              {
                icon: FlaskConical,
                label: 'Résultats',
                onPress: () => nav('/(patient)/resultats'),
                iconAccent: 'results',
              },
              {
                icon: FileText,
                label: 'Mes documents',
                onPress: () => nav('/profile/documents'),
                iconAccent: 'teal',
              },
              {
                icon: Star,
                label: 'Mes avis',
                onPress: () => nav('/(patient)/reviews'),
                iconAccent: 'warning',
              },
            ],
          },
          {
            title: 'Aide',
            delay: 180,
            items: buildHelpMoreItems(nav),
          },
          {
            title: 'Paramètres',
            delay: 240,
            items: [
              {
                icon: Settings,
                label: "Paramètres de l'app",
                onPress: () => nav('/profile/settings'),
                iconAccent: 'settings',
              },
              {
                icon: Bell,
                label: 'Notifications',
                onPress: () => router.push(getNotificationsPath('patient')),
                badge: unread,
              },
              {
                icon: ScanFace,
                label: biometricLabel,
                onPress: () => nav('/profile/security'),
                iconAccent: 'teal',
              },
              {
                icon: Scale,
                label: 'Informations légales',
                onPress: () => nav('/(patient)/informations-legales'),
                iconAccent: 'muted',
              },
            ],
          },
        ]}
        logoutDelay={300}
      />
    </TabScreenShell>
  );
}
