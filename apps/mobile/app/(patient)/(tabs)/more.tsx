import { useRouter } from 'expo-router';
import { Bell, FileText, Scale, ScanFace, User } from 'lucide-react-native';
import { useBiometricLabel } from '@/features/profile/hooks/use-biometric-label';
import { TabScreenShell } from '@/components/navigation/TabScreenShell';
import { RoleMoreTabScreen } from '@/features/profile/screens/RoleMoreTabScreen';
import { useUnreadNotificationsCount } from '@/features/notifications/hooks/use-unread-count';
import { getNotificationsPath } from '@/navigation/notifications-route';

export default function PatientMore() {
  const router = useRouter();
  const biometricLabel = useBiometricLabel('Biométrie');
  const unread = useUnreadNotificationsCount();

  const nav = (href: string) => router.push(href as never);

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
              icon: FileText,
              label: 'Mes documents',
              onPress: () => nav('/profile/documents'),
              iconColor: '#0D9488',
              iconBg: '#F0FDFA',
            },
          ],
        },
        {
          title: 'Paramètres',
          delay: 210,
          items: [
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
              iconColor: '#0D9488',
              iconBg: '#F0FDFA',
            },
            {
              icon: Scale,
              label: 'Informations légales',
              onPress: () => nav('/(patient)/informations-legales'),
              iconColor: '#64748B',
              iconBg: '#F1F5F9',
            },
          ],
        },
      ]}
      logoutDelay={270}
      />
    </TabScreenShell>
  );
}
