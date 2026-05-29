import { useRouter } from 'expo-router';
import { Bell, CalendarPlus, FlaskConical, Scale, ScanFace, User } from 'lucide-react-native';
import { useBiometricLabel } from '@/features/profile/hooks/use-biometric-label';
import { TabScreenShell } from '@/components/navigation/TabScreenShell';
import { RoleMoreTabScreen } from '@/features/profile/screens/RoleMoreTabScreen';
import { useUnreadNotificationsCount } from '@/features/notifications/hooks/use-unread-count';
import { getNotificationsPath } from '@/navigation/notifications-route';

export default function ProMore() {
  const router = useRouter();
  const biometricLabel = useBiometricLabel('Biométrie');
  const unread = useUnreadNotificationsCount();

  const nav = (href: string) => router.push(href as never);

  return (
    <TabScreenShell>
      <RoleMoreTabScreen
      roleLabel="Professionnel de santé"
      sections={[
        {
          title: 'Actions',
          delay: 150,
          items: [
            {
              icon: CalendarPlus,
              label: 'Nouveau rendez-vous',
              onPress: () => nav('/(pro)/appointments/new'),
              iconColor: '#0D9488',
              iconBg: '#F0FDFA',
            },
          ],
        },
        {
          title: 'Professionnel',
          delay: 210,
          items: [
            { icon: User, label: 'Mon profil', onPress: () => nav('/profile') },
            {
              icon: FlaskConical,
              label: 'Résultats',
              onPress: () => nav('/(pro)/resultats'),
              iconColor: '#059669',
              iconBg: '#ECFDF5',
            },
          ],
        },
        {
          title: 'Paramètres',
          delay: 270,
          items: [
            {
              icon: Bell,
              label: 'Notifications',
              onPress: () => router.push(getNotificationsPath('pro')),
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
              onPress: () => nav('/(pro)/informations-legales'),
              iconColor: '#64748B',
              iconBg: '#F1F5F9',
            },
          ],
        },
      ]}
      />
    </TabScreenShell>
  );
}
