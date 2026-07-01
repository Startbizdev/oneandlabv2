import { useRouter } from 'expo-router';
import {
  Activity,
  Bell,
  FileText,
  FlaskConical,
  Heart,
  LayoutGrid,
  Scale,
  Settings,
  Star,
  User,
} from 'lucide-react-native';
import { HealthRecordProgressRing } from '@/features/health-record/components/HealthRecordProgressRing';
import { useHealthRecordCompletion } from '@/features/health-record/hooks/use-health-record-completion';
import { buildHelpMoreItems } from '@/features/help/help-more-items';
import { PROFILE_SECURITY_MENU } from '@/features/profile/constants/profile-security-menu';
import { RoleMoreTabScreen } from '@/features/profile/screens/RoleMoreTabScreen';
import { useUnreadNotificationsCount } from '@/features/notifications/hooks/use-unread-count';
import { TAB_HEADER_SF } from '@/components/navigation/RoleNativeTabsLayout';
import { getNotificationsPath } from '@/navigation/notifications-route';
import { TitledTabScreenFrame } from '@/navigation/tab-screen-frames';

export default function PatientMore() {
  const router = useRouter();
  const unread = useUnreadNotificationsCount();
  const healthRecord = useHealthRecordCompletion();
  const hrPercent = healthRecord.data?.percent;

  const nav = (href: string) => router.navigate(href as never);

  return (
    <TitledTabScreenFrame title="Plus" symbol={TAB_HEADER_SF.more} fallbackIcon={LayoutGrid}>
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
                icon: Heart,
                label: 'Mon carnet de santé',
                onPress: () => nav('/(patient)/health-record'),
                iconAccent: 'heart',
                trailing:
                  hrPercent != null && hrPercent < 100 ? (
                    <HealthRecordProgressRing percent={hrPercent} variant="mini" />
                  ) : undefined,
              },
              {
                icon: Activity,
                label: 'Mes données santé',
                onPress: () => nav('/(patient)/health-data'),
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
                icon: PROFILE_SECURITY_MENU.Icon,
                label: PROFILE_SECURITY_MENU.label,
                onPress: () => nav(PROFILE_SECURITY_MENU.href),
                iconAccent: PROFILE_SECURITY_MENU.iconAccent,
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
    </TitledTabScreenFrame>
  );
}
