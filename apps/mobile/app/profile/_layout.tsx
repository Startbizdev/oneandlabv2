import { Stack } from 'expo-router';
import {
  FileText,
  Globe,
  GraduationCap,
  HeartPulse,
  HelpCircle,
  LifeBuoy,
  Lock,
  MapPin,
  Settings,
  User,
} from 'lucide-react-native';
import { tabHeaderTitle } from '@/navigation/HeaderTitle';
import { ProfileStackBackButton } from '@/navigation/ProfileStackBackButton';
import { stackHeaderOptions } from '@/navigation/screen-options';

const headerWithBack = {
  headerLeft: () => <ProfileStackBackButton />,
};

export default function ProfileLayout() {
  return (
    <Stack screenOptions={stackHeaderOptions()}>
      <Stack.Screen
        name="index"
        options={{
          title: 'Mon profil',
          headerTitle: tabHeaderTitle('Mon profil', User),
          ...headerWithBack,
        }}
      />
      <Stack.Screen
        name="menu"
        options={{
          title: 'Compte',
          headerTitle: tabHeaderTitle('Compte', User),
          ...headerWithBack,
        }}
      />
      <Stack.Screen
        name="personal"
        options={{
          title: 'Informations personnelles',
          headerTitle: tabHeaderTitle('Informations personnelles', User),
        }}
      />
      <Stack.Screen
        name="settings"
        options={{
          title: "Paramètres de l'app",
          headerTitle: tabHeaderTitle("Paramètres de l'app", Settings),
        }}
      />
      <Stack.Screen
        name="help/index"
        options={{
          title: "Centre d'aide",
          headerTitle: tabHeaderTitle("Centre d'aide", HelpCircle),
          ...headerWithBack,
        }}
      />
      <Stack.Screen
        name="help/[slug]"
        options={{
          title: 'Aide',
          headerTitle: tabHeaderTitle('Aide', HelpCircle),
          ...headerWithBack,
        }}
      />
      <Stack.Screen
        name="support"
        options={{
          title: 'Contacter le support',
          headerTitle: tabHeaderTitle('Contacter le support', LifeBuoy),
          ...headerWithBack,
        }}
      />
      <Stack.Screen
        name="security"
        options={{
          title: 'Mot de passe et connexion',
          headerTitle: tabHeaderTitle('Mot de passe et connexion', Lock),
        }}
      />
      <Stack.Screen
        name="documents"
        options={{
          title: 'Documents',
          headerTitle: tabHeaderTitle('Documents', FileText),
        }}
      />
      <Stack.Screen
        name="nurse/coordinates"
        options={{
          title: 'Coordonnées',
          headerTitle: tabHeaderTitle('Coordonnées', FileText),
          ...headerWithBack,
        }}
      />
      <Stack.Screen
        name="nurse/presentation"
        options={{
          title: 'Présentation',
          headerTitle: tabHeaderTitle('Présentation', Globe),
          ...headerWithBack,
        }}
      />
      <Stack.Screen
        name="nurse/settings"
        options={{
          title: 'Paramètres',
          headerTitle: tabHeaderTitle('Paramètres', Settings),
          ...headerWithBack,
        }}
      />
      <Stack.Screen
        name="nurse/qualifications"
        options={{
          title: 'Diplômes',
          headerTitle: tabHeaderTitle('Diplômes et formations', GraduationCap),
          ...headerWithBack,
        }}
      />
      <Stack.Screen
        name="nurse/care-types"
        options={{
          title: 'Types de soins',
          headerTitle: tabHeaderTitle('Types de soins', HeartPulse),
          ...headerWithBack,
        }}
      />
      <Stack.Screen
        name="nurse/coverage"
        options={{
          title: 'Zone de couverture',
          headerTitle: tabHeaderTitle('Zone de couverture', MapPin),
          ...headerWithBack,
        }}
      />
      <Stack.Screen name="coverage" options={{ headerShown: false }} />
      <Stack.Screen name="preferences" options={{ headerShown: false }} />
    </Stack>
  );
}
