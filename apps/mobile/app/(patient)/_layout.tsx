import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { FileText, Star } from 'lucide-react-native';
import { PROFILE_HEADER_SF } from '@/components/navigation/RoleNativeTabsLayout';
import { tabHeaderTitle } from '@/navigation/HeaderTitle';
import { notificationsScreenOptions } from '@/navigation/notifications-screen-options';
import { bookingWizardScreenOptions, stackHeaderOptions } from '@/navigation/screen-options';
import { StackSceneInsetLayout } from '@/navigation/StackSceneInsetLayout';

export default function PatientLayout() {
  const styles = useThemedStyles(buildStyles, 'PatientLayout');

  return (
    <View style={styles.stackHost}>
      <StackSceneInsetLayout>
      <Stack screenOptions={stackHeaderOptions()}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="appointment/[id]" options={{ title: 'Détail du rendez-vous' }} />
        <Stack.Screen
          name="appointment/[id]/documents"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="appointment/[id]/history"
          options={{ title: 'Historique' }}
        />
        <Stack.Screen name="booking/new" options={bookingWizardScreenOptions()} />
        <Stack.Screen name="relatives/[id]" options={{ title: 'Proche' }} />
        <Stack.Screen
          name="relatives/[id]/documents"
          options={{ title: 'Documents' }}
        />
        <Stack.Screen name="notifications" options={notificationsScreenOptions()} />
        <Stack.Screen name="resultats" options={{
          title: 'Résultats',
          headerTitle: tabHeaderTitle('Résultats', 'doc.text.magnifyingglass', FileText),
        }} />
        <Stack.Screen
          name="reviews"
          options={{
            title: 'Mes avis',
            headerTitle: tabHeaderTitle('Mes avis', PROFILE_HEADER_SF.reviews, Star),
          }}
        />
        <Stack.Screen name="informations-legales" options={{ headerTitleAlign: 'left' }} />
        <Stack.Screen name="web" options={{ headerTitleAlign: 'left' }} />
      </Stack>
      </StackSceneInsetLayout>
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
    stackHost: { flex: 1, backgroundColor: c.surface },
  };
}
