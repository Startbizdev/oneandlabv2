import { colors } from '@/theme';
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

export function AppWebViewScreen({ path, title = 'Cary', requireAuth = false }: Props) {
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
            <ActivityIndicator size="large" color={colors.primary} />
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  webview: { flex: 1, backgroundColor: colors.surface },
  loader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    zIndex: 2,
  },
});
