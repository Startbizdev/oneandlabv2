import { useRouter, type Href } from 'expo-router';
import {
  CalendarPlus,
  FilePenLine,
  FlaskConical,
  Inbox,
  Pill,
  QrCode,
  Share2,
  Sparkles,
  Store,
} from 'lucide-react-native';
import type { SettingsRowProps } from '@/components/ui/SettingsRow';
import { usePharmacyModuleEnabled } from '@/features/pharmacy-orders/hooks/use-pharmacy-module-enabled';
import { SHOW_PRESCRIPTIONS_TAB_NAV, prescriptionGenerationEnabled } from '@/features/prescriptions/constants';
import { useSharePublicProfile } from '@/features/profile/hooks/use-share-public-profile';
import { proPublicProfilePath } from '@/features/profile/utils/pro-public-profile';
import { RoleMoreTabScreen } from '@/features/profile/screens/RoleMoreTabScreen';
import { useAuthStore } from '@/store/auth-store';
import { TabScreenFrame } from '@/components/navigation/TabScreenFrame';

export default function ProMore() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const {
    canOrder: pharmacyCanOrder,
    canReceive: pharmacyCanReceive,
    isOwnPharmacy,
  } = usePharmacyModuleEnabled();
  const sharePublicProfile = useSharePublicProfile(proPublicProfilePath, '/profile');

  const nav = (href: Href) => router.push(href);
  const rxEnabled = prescriptionGenerationEnabled(user);
  const rxInTabBar = SHOW_PRESCRIPTIONS_TAB_NAV && rxEnabled;

  const activity: SettingsRowProps[] = [
    { icon: CalendarPlus, label: 'Nouveau rendez-vous', onPress: () => nav('/(pro)/appointments/new') },
    { icon: FlaskConical, label: 'Résultats', onPress: () => nav('/(pro)/resultats') },
  ];
  if (rxEnabled && !rxInTabBar) {
    activity.push({ icon: FilePenLine, label: 'Prescriptions', onPress: () => nav('/(pro)/prescriptions') });
  }
  if (pharmacyCanOrder) {
    activity.push({ icon: Pill, label: 'Commandes pharmacie', onPress: () => nav('/(pro)/commandes-pharmacie') });
  }
  if (pharmacyCanReceive) {
    activity.push({ icon: Inbox, label: 'Commandes reçues', onPress: () => nav('/(pro)/commandes-recues') });
  }
  activity.push({ icon: Sparkles, label: 'Assistant Cary', onPress: () => nav('/(pro)/ai') });

  const professional: SettingsRowProps[] = [
    { icon: Share2, label: 'Partager mon profil', onPress: () => void sharePublicProfile() },
    { icon: QrCode, label: 'QR code', onPress: () => nav('/(pro)/qr-code') },
  ];
  if (isOwnPharmacy) {
    professional.push({
      icon: Store,
      label: 'Réglages de l’officine',
      onPress: () => nav('/profile/pharmacy-settings'),
    });
  }

  return (
    <TabScreenFrame title="Plus">
      <RoleMoreTabScreen
        roleLabel="Professionnel de santé"
        legalHref="/(pro)/informations-legales"
        sections={[
          { title: 'Activité', items: activity },
          { title: 'Professionnel', items: professional },
        ]}
      />
    </TabScreenFrame>
  );
}
