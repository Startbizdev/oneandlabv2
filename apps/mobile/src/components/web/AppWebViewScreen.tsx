import { useAppColors } from '@/theme/use-app-colors';
import { useMemo, useState } from 'react';
import { AppText, spacing, useStyles, font, type Theme } from '@/theme';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useLiquidGlassHeaderInset } from '@/components/navigation/liquid-glass-header-inset';
import { ErrorState } from '@/components/ui/ErrorState';
import { StackChromeScreen } from '@/navigation/StackChromeScreen';
import { webAppUrl } from '@/config/env';
import { useAuthStore } from '@/store/auth-store';

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

type LoadFailure = { kind: 'network' } | { kind: 'http'; status: number };

/** Réseau : `null` → message par défaut d'`ErrorState` (vérifier la connexion). */
function loadFailureError(failure: LoadFailure): Error | null {
  if (failure.kind === 'network') return null;
  return new Error(
    `Le serveur n'a pas pu afficher cette page (erreur ${failure.status}). Réessayez dans quelques instants.`,
  );
}

export function AppWebViewScreen({ path, title = 'Cary', requireAuth = false }: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);

  const token = useAuthStore((s) => s.token);
  const uri = webAppUrl(path);

  const [loading, setLoading] = useState(true);
  const [loadFailure, setLoadFailure] = useState<LoadFailure | null>(null);
  const [attempt, setAttempt] = useState(0);
  const headerInset = useLiquidGlassHeaderInset();

  const injectedBefore = useMemo(() => {
    if (!requireAuth || !token) return undefined;
    return buildAuthInjectionScript(token);
  }, [requireAuth, token]);

  const retry = () => {
    setLoadFailure(null);
    setLoading(true);
    setAttempt((n) => n + 1);
  };

  const titleNode = (
    <AppText style={styles.title} numberOfLines={1}>
      {title}
    </AppText>
  );

  return (
    <StackChromeScreen title={titleNode}>
      <View style={[styles.container, { paddingTop: headerInset }]}>
        {loadFailure ? (
          <View style={styles.errorOverlay}>
            <ErrorState
              title="Page indisponible"
              error={loadFailureError(loadFailure)}
              onRetry={retry}
            />
          </View>
        ) : loading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color={c.primary} />
          </View>
        ) : null}
        <WebView
          key={attempt}
          source={{ uri }}
          style={styles.webview}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          onError={() => setLoadFailure({ kind: 'network' })}
          onHttpError={({ nativeEvent }) => {
            if (nativeEvent.statusCode >= 400) {
              setLoadFailure({ kind: 'http', status: nativeEvent.statusCode });
            }
          }}
          injectedJavaScriptBeforeContentLoaded={injectedBefore}
          javaScriptEnabled
          domStorageEnabled
          sharedCookiesEnabled
          startInLoadingState={false}
        />
      </View>
    </StackChromeScreen>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
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
    errorOverlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center' as const,
      paddingHorizontal: spacing[4],
      backgroundColor: c.background,
      zIndex: 2,
    },
    title: {
      minWidth: 0,
      ...font.heading,
      fontSize: fontSize.lg,
      color: c.textPrimary,
      flexShrink: 1,
    },
  };
}
