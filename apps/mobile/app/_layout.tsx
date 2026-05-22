import 'react-native-gesture-handler';
import 'react-native-reanimated';
import '../global.css';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
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
import { useAuthGuard } from '@/features/auth/hooks/use-auth-guard';
import { registerNotificationHandlers } from '@/features/notifications/handlers/register-handlers';
import { useDeepLinks } from '@/features/navigation/hooks/use-deep-links';
import { NetworkProvider } from '@/providers/NetworkProvider';
import { usePushTokenRegistration } from '@/features/notifications/hooks/use-push-token-registration';
import { colors } from '@/theme';

function RootLayoutInner() {
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
    registerNotificationHandlers();
  }, [hydrate]);

  useAuthGuard();
  useDeepLinks();
  usePushTokenRegistration();

  return (
    <>
      <StatusBar style="dark" backgroundColor={colors.background} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { flex: 1, backgroundColor: colors.background } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(nurse)" />
        <Stack.Screen name="(pro)" />
        <Stack.Screen name="(preleveur)" />
        <Stack.Screen name="(patient)" />
        <Stack.Screen name="profile" options={{ headerShown: false }} />
        <Stack.Screen name="notifications" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_500Medium,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    Nunito_900Black,
  });

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  return (
    <ErrorBoundary>
      <NetworkProvider>
        <AppProviders>
          <RootLayoutInner />
        </AppProviders>
      </NetworkProvider>
    </ErrorBoundary>
  );
}
