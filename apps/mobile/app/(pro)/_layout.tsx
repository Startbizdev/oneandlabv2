import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { QrCode } from 'lucide-react-native';
import { PROFILE_HEADER_SF } from '@/components/navigation/RoleNativeTabsLayout';
import { tabHeaderTitle } from '@/navigation/HeaderTitle';
import { notificationsScreenOptions } from '@/navigation/notifications-screen-options';
import { bookingWizardScreenOptions, onboardingScreenOptions, stackHeaderOptions } from '@/navigation/screen-options';
import { StackSceneInsetLayout } from '@/navigation/StackSceneInsetLayout';

export default function ProLayout() {
  const styles = useThemedStyles(buildStyles, 'ProLayout');

  return (
    <View style={styles.stackHost}>
      <StackSceneInsetLayout>
      <Stack screenOptions={stackHeaderOptions()}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={onboardingScreenOptions()} />
        <Stack.Screen name="appointment/[id]" options={{ title: 'Détail du rendez-vous' }} />
        <Stack.Screen
          name="appointment/[id]/care-photo/[photoId]"
          options={{ headerShown: false, animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="appointment/[id]/exchange"
          options={{ headerShown: false, animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="appointment/[id]/prescription"
          options={{ title: 'Créer une ordonnance', animation: 'slide_from_right' }}
        />
        <Stack.Screen name="appointment/[id]/edit" options={{ title: 'Reprendre le RDV' }} />
        <Stack.Screen name="appointments/new" options={bookingWizardScreenOptions()} />
        <Stack.Screen name="patient/[id]" options={{ title: 'Patient' }} />
        <Stack.Screen name="patient/[id]/history" options={{ title: 'Historique' }} />
        <Stack.Screen name="patient/[id]/documents" options={{ headerTitleAlign: 'left' }} />
        <Stack.Screen name="notifications" options={notificationsScreenOptions()} />
        <Stack.Screen
          name="qr-code"
          options={{
            title: 'QR code',
            headerTitle: tabHeaderTitle('QR code', PROFILE_HEADER_SF.qrCode, QrCode),
          }}
        />
        <Stack.Screen name="resultats" options={{ title: 'Résultats' }} />
        <Stack.Screen name="ai" options={{ headerShown: false, animation: 'slide_from_right' }} />
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
