import { Stack } from 'expo-router';
import { notificationsScreenOptions } from '@/navigation/notifications-screen-options';
import { bookingWizardScreenOptions, stackHeaderOptions } from '@/navigation/screen-options';

export default function PatientLayout() {
  return (
    <Stack screenOptions={stackHeaderOptions()}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="appointment/[id]" options={{ title: 'Détail du rendez-vous' }} />
      <Stack.Screen
        name="appointment/[id]/documents"
        options={{ title: 'Documents' }}
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
      <Stack.Screen name="informations-legales" options={{ headerTitleAlign: 'left' }} />
      <Stack.Screen name="web" options={{ headerTitleAlign: 'left' }} />
    </Stack>
  );
}
