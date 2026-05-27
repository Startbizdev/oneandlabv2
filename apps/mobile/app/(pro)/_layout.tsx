import { StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { APP_HEADER_CHROME } from '@/components/navigation/header-layout';
import { notificationsScreenOptions } from '@/navigation/notifications-screen-options';
import { bookingWizardScreenOptions, stackHeaderOptions } from '@/navigation/screen-options';

export default function ProLayout() {
  return (
    <View style={styles.stackHost}>
      <Stack screenOptions={stackHeaderOptions()}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="appointment/[id]" options={{ title: 'Détail du rendez-vous' }} />
        <Stack.Screen
          name="appointment/[id]/care-photo/[photoId]"
          options={{ headerShown: false, animation: 'slide_from_right' }}
        />
        <Stack.Screen name="appointment/[id]/edit" options={{ title: 'Reprendre le RDV' }} />
        <Stack.Screen name="appointments/new" options={bookingWizardScreenOptions()} />
        <Stack.Screen name="patient/[id]" options={{ title: 'Patient' }} />
        <Stack.Screen name="patient/[id]/history" options={{ title: 'Historique' }} />
        <Stack.Screen name="patient/[id]/documents" options={{ headerTitleAlign: 'left' }} />
        <Stack.Screen name="notifications" options={notificationsScreenOptions()} />
        <Stack.Screen name="informations-legales" options={{ headerTitleAlign: 'left' }} />
        <Stack.Screen name="web" options={{ headerTitleAlign: 'left' }} />
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  stackHost: { flex: 1, backgroundColor: APP_HEADER_CHROME },
});
