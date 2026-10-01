import 'react-native-gesture-handler';
import 'react-native-reanimated';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { Stack, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFonts } from 'expo-font';
import {
  Raleway_600SemiBold,
  Raleway_700Bold,
  Raleway_800ExtraBold,
} from '@expo-google-fonts/raleway';
import { AppProviders } from '@/providers/AppProviders';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useAuthStore } from '@/store/auth-store';
import { useAuthGuard } from '@/features/auth/hooks/use-auth-guard';
import { useOnboardingGate } from '@/features/onboarding/hooks/use-onboarding-gate';
import { MustChangePasswordGate } from '@/features/auth/components/MustChangePasswordGate';
import { BiometricEnrollmentOfferHost } from '@/features/auth/components/BiometricEnrollmentOfferHost';
import { AppUpdateGate } from '@/features/app-update/components/AppUpdateGate';
import { registerNotificationHandlers } from '@/features/notifications/handlers/register-handlers';
import { useAppointmentsRefreshOnNotifications } from '@/features/appointments/hooks/use-appointments-refresh-on-notifications';
import { useDeepLinks } from '@/features/navigation/hooks/use-deep-links';
import { NetworkProvider } from '@/providers/NetworkProvider';
import { usePushTokenRegistration } from '@/features/notifications/hooks/use-push-token-registration';
import { useAppColors } from '@/theme/use-app-colors';

SplashScreen.preventAutoHideAsync().catch(() => {});
SplashScreen.setOptions({ fade: true, duration: 250 });

function RootLayoutInner() {
  const c = useAppColors();
  const hydrate = useAuthStore((s) => s.hydrate);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  // `index` ne fait qu'aiguiller (Redirect) : le splash couvre l'écran tant qu'on n'a pas quitté cette route.
  const onDestinationRoute = useSegments().length > 0;

  useEffect(() => {
    void hydrate();
    registerNotificationHandlers();
  }, [hydrate]);

  useEffect(() => {
    if (isHydrated && onDestinationRoute) SplashScreen.hide();
  }, [isHydrated, onDestinationRoute]);

  useAuthGuard();
  useOnboardingGate();
  useDeepLinks();
  usePushTokenRegistration();
  useAppointmentsRefreshOnNotifications();

  return (
    <View style={styles.root}>
      <StatusBar style="dark" backgroundColor={c.background} />
      <Stack
        screenOptions={{ headerShown: false, contentStyle: { flex: 1, backgroundColor: c.background } }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(nurse)" />
        <Stack.Screen name="(pro)" />
        <Stack.Screen name="(preleveur)" />
        <Stack.Screen name="(patient)" />
        <Stack.Screen name="profile" options={{ headerShown: false }} />
        <Stack.Screen name="notifications" options={{ headerShown: false }} />
      </Stack>
      <MustChangePasswordGate />
      <BiometricEnrollmentOfferHost />
      <AppUpdateGate />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Raleway_600SemiBold,
    Raleway_700Bold,
    Raleway_800ExtraBold,
  });

  useEffect(() => {
    if (fontError) console.warn('[fonts] Raleway non chargée, police système utilisée', fontError);
  }, [fontError]);

  // Android ne remesure pas un texte quand sa police arrive après le premier layout (texte tronqué).
  if (!fontsLoaded && !fontError) return null;

  return (
    <ErrorBoundary>
      <KeyboardProvider>
        <NetworkProvider>
          <AppProviders>
            <RootLayoutInner />
          </AppProviders>
        </NetworkProvider>
      </KeyboardProvider>
    </ErrorBoundary>
  );
}
