import { View } from 'react-native';
import { Stack } from 'expo-router';
import { notificationsScreenOptions } from '@/navigation/notifications-screen-options';
import { bookingWizardScreenOptions, onboardingScreenOptions, stackHeaderOptions } from '@/navigation/screen-options';
import { StackSceneInsetLayout } from '@/navigation/StackSceneInsetLayout';
import { useStyles, useTheme, type Theme } from '@/theme';

export default function PreleveurLayout() {
  const theme = useTheme();
  const styles = useStyles(buildStyles);

  return (
    <View style={styles.stackHost}>
      <StackSceneInsetLayout>
      <Stack screenOptions={stackHeaderOptions(theme)}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={onboardingScreenOptions(theme)} />
        <Stack.Screen name="appointments/new" options={bookingWizardScreenOptions(theme)} />
        <Stack.Screen name="appointment/[id]" options={{ title: 'Détail du rendez-vous' }} />
        <Stack.Screen name="appointment/[id]/edit" options={{ title: 'Nouveau créneau' }} />
        <Stack.Screen name="appointment/[id]/conversation" options={{ title: 'Échanges du rendez-vous' }} />
        <Stack.Screen name="notifications" options={notificationsScreenOptions(theme)} />
        <Stack.Screen name="ai" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="informations-legales" options={{ headerTitleAlign: 'left' }} />
        <Stack.Screen name="web" options={{ headerTitleAlign: 'left' }} />
      </Stack>
      </StackSceneInsetLayout>
    </View>
  );
}

function buildStyles({ colors: c }: Theme) {
  return {
    stackHost: { flex: 1, backgroundColor: c.background },
  };
}
