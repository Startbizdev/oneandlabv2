import { useRouter } from 'expo-router';
import { Sparkles } from 'lucide-react-native';
import { RoleMoreTabScreen } from '@/features/profile/screens/RoleMoreTabScreen';
import { TabScreenFrame } from '@/components/navigation/TabScreenFrame';

export default function PreleveurMore() {
  const router = useRouter();

  return (
    <TabScreenFrame title="Plus">
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
                onPress: () => router.push('/(preleveur)/ai'),
              },
            ],
          },
        ]}
      />
    </TabScreenFrame>
  );
}
