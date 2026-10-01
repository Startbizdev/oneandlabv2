import { useRouter, type Href } from 'expo-router';
import {
  CalendarPlus,
  CreditCard,
  FilePenLine,
  FlaskConical,
  Pill,
  QrCode,
  Share2,
  Sparkles,
  Star,
} from 'lucide-react-native';
import type { SettingsRowProps } from '@/components/ui/SettingsRow';
import { usePharmacyModuleEnabled } from '@/features/pharmacy-orders/hooks/use-pharmacy-module-enabled';
import { prescriptionGenerationEnabled } from '@/features/prescriptions/constants';
import { useSharePublicProfile } from '@/features/profile/hooks/use-share-public-profile';
import { nursePublicProfilePath } from '@/features/profile/utils/nurse-public-profile';
import { RoleMoreTabScreen } from '@/features/profile/screens/RoleMoreTabScreen';
import { useAuthStore } from '@/store/auth-store';
import { TabScreenFrame } from '@/components/navigation/TabScreenFrame';

export default function NurseMore() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { canOrder: pharmacyCanOrder } = usePharmacyModuleEnabled();
  const sharePublicProfile = useSharePublicProfile(nursePublicProfilePath, '/profile/nurse/presentation');

  const nav = (href: Href) => router.push(href);

  const activity: SettingsRowProps[] = [
    { icon: CalendarPlus, label: 'Nouveau rendez-vous', onPress: () => nav('/(nurse)/appointments/new') },
    { icon: Sparkles, label: 'Assistant Cary', onPress: () => nav('/(nurse)/ai') },
    { icon: FlaskConical, label: 'Résultats', onPress: () => nav('/(nurse)/resultats') },
  ];
  if (prescriptionGenerationEnabled(user)) {
    activity.push({ icon: FilePenLine, label: 'Ordonnances', onPress: () => nav('/(nurse)/prescriptions') });
  }
  if (pharmacyCanOrder) {
    activity.push({ icon: Pill, label: 'Commandes pharmacie', onPress: () => nav('/(nurse)/commandes-pharmacie') });
  }

  return (
    <TabScreenFrame title="Plus">
      <RoleMoreTabScreen
        roleLabel="Infirmier(ère)"
        legalHref="/(nurse)/informations-legales"
        sections={[
          { title: 'Activité', items: activity },
          {
            title: 'Professionnel',
            items: [
              { icon: Share2, label: 'Partager mon profil', onPress: () => void sharePublicProfile() },
              { icon: QrCode, label: 'QR code', onPress: () => nav('/(nurse)/qr-code') },
              { icon: Star, label: 'Mes avis', onPress: () => nav('/(nurse)/reviews') },
              { icon: CreditCard, label: 'Abonnement', onPress: () => nav('/(nurse)/abonnement') },
            ],
          },
        ]}
      />
    </TabScreenFrame>
  );
}
