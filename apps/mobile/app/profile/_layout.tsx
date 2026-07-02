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
import { PROFILE_HEADER_SF } from '@/components/navigation/RoleNativeTabsLayout';
import { tabHeaderTitle } from '@/navigation/HeaderTitle';
import { stackHeaderOptions } from '@/navigation/screen-options';
import { StackSceneInsetLayout } from '@/navigation/StackSceneInsetLayout';

export default function ProfileLayout() {
  return (
    <StackSceneInsetLayout>
    <Stack screenOptions={stackHeaderOptions()}>
      <Stack.Screen
        name="index"
        options={{
          title: 'Mon profil',
          headerTitle: tabHeaderTitle('Mon profil', PROFILE_HEADER_SF.profile, User),
        }}
      />
      <Stack.Screen
        name="menu"
        options={{
          title: 'Compte',
          headerTitle: tabHeaderTitle('Compte', PROFILE_HEADER_SF.account, User),
        }}
      />
      <Stack.Screen
        name="personal"
        options={{
          title: 'Informations personnelles',
          headerTitle: tabHeaderTitle(
            'Informations personnelles',
            PROFILE_HEADER_SF.personal,
            User,
          ),
        }}
      />
      <Stack.Screen
        name="settings"
        options={{
          title: "Paramètres de l'app",
          headerTitle: tabHeaderTitle("Paramètres de l'app", PROFILE_HEADER_SF.settings, Settings),
        }}
      />
      <Stack.Screen
        name="help/index"
        options={{
          title: "Centre d'aide",
          headerTitle: tabHeaderTitle("Centre d'aide", PROFILE_HEADER_SF.help, HelpCircle),
        }}
      />
      <Stack.Screen
        name="help/[slug]"
        options={{
          title: 'Aide',
          headerTitle: tabHeaderTitle('Aide', PROFILE_HEADER_SF.help, HelpCircle),
        }}
      />
      <Stack.Screen
        name="support"
        options={{
          title: 'Contacter le support',
          headerTitle: tabHeaderTitle('Contacter le support', PROFILE_HEADER_SF.support, LifeBuoy),
        }}
      />
      <Stack.Screen
        name="security"
        options={{
          title: 'Mot de passe et connexion',
          headerTitle: tabHeaderTitle(
            'Mot de passe et connexion',
            PROFILE_HEADER_SF.security,
            Lock,
          ),
        }}
      />
      <Stack.Screen
        name="documents"
        options={{
          title: 'Mes documents',
          headerTitle: tabHeaderTitle('Mes documents', PROFILE_HEADER_SF.documents, FileText),
        }}
      />
      <Stack.Screen
        name="nurse/coordinates"
        options={{
          title: 'Coordonnées',
          headerTitle: tabHeaderTitle('Coordonnées', PROFILE_HEADER_SF.coordinates, FileText),
        }}
      />
      <Stack.Screen
        name="nurse/presentation"
        options={{
          title: 'Présentation',
          headerTitle: tabHeaderTitle('Présentation', PROFILE_HEADER_SF.presentation, Globe),
        }}
      />
      <Stack.Screen
        name="nurse/settings"
        options={{
          title: 'Paramètres',
          headerTitle: tabHeaderTitle('Paramètres', PROFILE_HEADER_SF.nurseSettings, Settings),
        }}
      />
      <Stack.Screen
        name="nurse/qualifications"
        options={{
          title: 'Diplômes',
          headerTitle: tabHeaderTitle(
            'Diplômes et formations',
            PROFILE_HEADER_SF.qualifications,
            GraduationCap,
          ),
        }}
      />
      <Stack.Screen
        name="nurse/care-types"
        options={{
          title: 'Types de soins',
          headerTitle: tabHeaderTitle('Types de soins', PROFILE_HEADER_SF.careTypes, HeartPulse),
        }}
      />
      <Stack.Screen
        name="nurse/coverage"
        options={{
          title: 'Zone de couverture',
          headerTitle: tabHeaderTitle('Zone de couverture', PROFILE_HEADER_SF.coverage, MapPin),
        }}
      />
      <Stack.Screen name="coverage" options={{ headerShown: false }} />
      <Stack.Screen name="preferences" options={{ headerShown: false }} />
    </Stack>
    </StackSceneInsetLayout>
  );
}
