import 'react-native-gesture-handler';
import 'react-native-reanimated';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import '../global.css';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFonts } from 'expo-font';
import {
  Nunito_400Regular,
  Nunito_500Medium,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  Nunito_900Black,
} from '@expo-google-fonts/nunito';
import { AppProviders } from '@/providers/AppProviders';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useAuthStore } from '@/store/auth-store';
import { useAppPreferencesStore } from '@/store/app-preferences-store';
import { useAuthGuard } from '@/features/auth/hooks/use-auth-guard';
import { MustChangePasswordGate } from '@/features/auth/components/MustChangePasswordGate';
import { registerNotificationHandlers } from '@/features/notifications/handlers/register-handlers';
import { useDeepLinks } from '@/features/navigation/hooks/use-deep-links';
import { NetworkProvider } from '@/providers/NetworkProvider';
import { usePushTokenRegistration } from '@/features/notifications/hooks/use-push-token-registration';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootLayoutInner() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const colorblindType = useAppPreferencesStore((s) => s.colorblindType);
  const textScale = useAppPreferencesStore((s) => s.textScale);

  useEffect(() => {
    void hydrate();
    registerNotificationHandlers();
  }, [hydrate]);

  useAuthGuard();
  useDeepLinks();
  usePushTokenRegistration();

  return (
    <View style={styles.root}>
      <StatusBar style="dark" backgroundColor={colors.background} />
      <Stack
        key={`${colorblindType}:${textScale}`}
        screenOptions={{ headerShown: false, contentStyle: { flex: 1, backgroundColor: colors.background } }}
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_500Medium,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    Nunito_900Black,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

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
