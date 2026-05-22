import { Stack } from 'expo-router';
import { notificationsScreenOptions } from '@/navigation/notifications-screen-options';
import { stackHeaderOptions } from '@/navigation/screen-options';

export default function PreleveurLayout() {
  return (
    <Stack screenOptions={stackHeaderOptions()}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="appointment/[id]" options={{ title: 'Détail du rendez-vous' }} />
      <Stack.Screen name="appointment/[id]/edit" options={{ title: 'Reprendre le RDV' }} />
      <Stack.Screen name="tournee" options={{ title: 'Ma tournée' }} />
      <Stack.Screen name="notifications" options={notificationsScreenOptions()} />
      <Stack.Screen name="informations-legales" options={{ headerTitleAlign: 'left' }} />
      <Stack.Screen name="web" options={{ headerTitleAlign: 'left' }} />
    </Stack>
  );
}
