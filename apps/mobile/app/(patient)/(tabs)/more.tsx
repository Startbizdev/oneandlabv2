import { useRouter } from 'expo-router';
import { Activity, FileText, Heart, Pill, Star, Users } from 'lucide-react-native';
import { HealthRecordProgressRing } from '@/features/health-record/components/HealthRecordProgressRing';
import { useHealthRecordCompletion } from '@/features/health-record/hooks/use-health-record-completion';
import { RoleMoreTabScreen } from '@/features/profile/screens/RoleMoreTabScreen';
import { TitledTabScreenFrame } from '@/navigation/tab-screen-frames';

export default function PatientMore() {
  const router = useRouter();
  const healthRecord = useHealthRecordCompletion();
  const hrPercent = healthRecord.data?.percent;

  const nav = (href: string) => router.navigate(href as never);

  return (
    <TitledTabScreenFrame title="Compte">
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
                iconAccent: 'heart',
                trailing:
                  hrPercent != null && hrPercent < 100 ? (
                    <HealthRecordProgressRing percent={hrPercent} variant="mini" />
                  ) : undefined,
              },
              {
                icon: FileText,
                label: 'Mes documents',
                onPress: () => nav('/profile/documents'),
                iconAccent: 'teal',
              },
              {
                icon: Pill,
                label: 'Mes traitements',
                onPress: () => nav('/(patient)/traitements'),
                iconAccent: 'teal',
              },
              {
                icon: Activity,
                label: 'Mes données santé',
                onPress: () => nav('/(patient)/health-data'),
                iconAccent: 'teal',
              },
              {
                icon: Users,
                label: 'Mes proches',
                description: 'Réserver pour un membre de votre famille',
                onPress: () => nav('/(patient)/relatives'),
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
        ]}
      />
    </TitledTabScreenFrame>
  );
}
