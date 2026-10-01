import { useRouter, type Href } from 'expo-router';
import { Activity, FileText, Heart, Pill, ShieldCheck, Star, Users } from 'lucide-react-native';
import { HealthRecordProgressRing } from '@/features/health-record/components/HealthRecordProgressRing';
import { useHealthRecordCompletion } from '@/features/health-record/hooks/use-health-record-completion';
import { RoleMoreTabScreen } from '@/features/profile/screens/RoleMoreTabScreen';
import { TabScreenFrame } from '@/components/navigation/TabScreenFrame';

export default function PatientMore() {
  const router = useRouter();
  const healthRecord = useHealthRecordCompletion();
  const hrPercent = healthRecord.data?.percent;

  const nav = (href: Href) => router.navigate(href);

  return (
    <TabScreenFrame title="Compte">
      <RoleMoreTabScreen
        roleLabel="Patient"
        legalHref="/(patient)/informations-legales"
        sections={[
          {
            title: 'Ma santé',
            items: [
              {
                icon: Heart,
                label: 'Mon carnet de santé',
                onPress: () => nav('/(patient)/health-record'),
                trailing:
                  hrPercent != null && hrPercent < 100 ? (
                    <HealthRecordProgressRing percent={hrPercent} variant="mini" />
                  ) : undefined,
              },
              { icon: FileText, label: 'Mes documents', onPress: () => nav('/profile/documents') },
              { icon: Pill, label: 'Mes traitements', onPress: () => nav('/(patient)/traitements') },
              { icon: Activity, label: 'Mes données santé', onPress: () => nav('/(patient)/health-data') },
            ],
          },
          {
            title: 'Mon entourage',
            items: [{ icon: Users, label: 'Mes proches', onPress: () => nav('/(patient)/relatives') }],
          },
          {
            title: 'Mes soignants',
            items: [
              {
                icon: ShieldCheck,
                label: 'Mes donneurs de soins',
                onPress: () => nav('/profile/care-origins'),
              },
              { icon: Star, label: 'Mes avis', onPress: () => nav('/(patient)/reviews') },
            ],
          },
        ]}
      />
    </TabScreenFrame>
  );
}
