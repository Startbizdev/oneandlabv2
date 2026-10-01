import { useRouter } from 'expo-router';
import { Sparkles } from 'lucide-react-native';
import { RoleMoreTabScreen } from '@/features/profile/screens/RoleMoreTabScreen';
import { TitledTabScreenFrame } from '@/navigation/tab-screen-frames';

export default function PreleveurMore() {
  const router = useRouter();

  return (
    <TitledTabScreenFrame title="Plus">
      <RoleMoreTabScreen
        roleLabel="Préleveur"
        legalHref="/(preleveur)/informations-legales"
        sections={[
          {
            title: 'Activité',
            items: [
              {
                icon: Sparkles,
                label: 'Assistant Cary',
                onPress: () => router.push('/(preleveur)/ai' as never),
                iconAccent: 'teal',
              },
            ],
          },
        ]}
      />
    </TitledTabScreenFrame>
  );
}
