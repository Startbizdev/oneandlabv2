import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { WebView } from 'react-native-webview';
import { webAppUrl } from '@/config/env';
import { useAuthStore } from '@/store/auth-store';
import { ProfileStackBackButton } from '@/navigation/ProfileStackBackButton';


interface Props {
  /** Chemin web relatif, ex. `/nurse/abonnement` */
  path: string;
  title?: string;
  /** Injecte le token mobile dans `localStorage` (pages espace connecté). */
  requireAuth?: boolean;
}

function buildAuthInjectionScript(token: string): string {
  const encoded = JSON.stringify(token);
  return `(function(){try{localStorage.setItem('auth_token',${encoded});}catch(e){}})();true;`;
}

export function AppWebViewScreen(
{ path, title = 'Cary', requireAuth = false }: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'components_web_AppWebViewScreen_tsx_AppWebViewScreen_styles');

  const token = useAuthStore((s) => s.token);
  const uri = webAppUrl(path);
  const [loading, setLoading] = useState(true);

  const injectedBefore = useMemo(() => {
    if (!requireAuth || !token) return undefined;
    return buildAuthInjectionScript(token);
  }, [requireAuth, token]);

  return (
    <>
      <Stack.Screen
        options={{
          title,
          headerTitleAlign: 'left',
          headerLeft: () => <ProfileStackBackButton />,
        }}
      />
      <View style={styles.container}>
        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color={c.primary} />
          </View>
        ) : null}
        <WebView
          source={{ uri }}
          style={styles.webview}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          injectedJavaScriptBeforeContentLoaded={injectedBefore}
          javaScriptEnabled
          domStorageEnabled
          sharedCookiesEnabled
          startInLoadingState={false}
        />
      </View>
    </>
  );
}

function buildStyles(c: AppColors) {
  return {
  container: { minWidth: 0, flex: 1, backgroundColor: c.background },
  webview: { minWidth: 0, flex: 1, backgroundColor: c.surface },
  loader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: c.background,
    zIndex: 2,
  },
};
}
