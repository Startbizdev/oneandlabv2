import { useAppColors } from '@/theme/use-app-colors';
import { useState } from 'react';
import { spacing, useStyles, type Theme } from '@/theme';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { ErrorState } from '@/components/ui/ErrorState';
import { StackChromeScreen } from '@/navigation/StackChromeScreen';
import { webAppUrl } from '@/config/env';

interface Props {
  /** Chemin web public relatif sans paramètres, ex. `/cgv` */
  path: string;
  /** Absent : titre de `STACK_HEADER_CATALOG`. */
  title?: string;
}

type LoadFailure = { kind: 'network' } | { kind: 'http'; status: number };

/** Réseau : `null` → message par défaut d'`ErrorState` (vérifier la connexion). */
function loadFailureError(failure: LoadFailure): Error | null {
  if (failure.kind === 'network') return null;
  return new Error(
    `Le serveur n'a pas pu afficher cette page (erreur ${failure.status}). Réessayez dans quelques instants.`,
  );
}

export function AppWebViewScreen({ path, title }: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const uri = webAppUrl(`${path}?embed=1`);

  const [loading, setLoading] = useState(true);
  const [loadFailure, setLoadFailure] = useState<LoadFailure | null>(null);
  const [attempt, setAttempt] = useState(0);

  const retry = () => {
    setLoadFailure(null);
    setLoading(true);
    setAttempt((n) => n + 1);
  };

  return (
    <StackChromeScreen title={title}>
      <View style={styles.container}>
        {loadFailure ? (
          <View style={styles.overlay}>
            <ErrorState title="Page indisponible" error={loadFailureError(loadFailure)} onRetry={retry} />
          </View>
        ) : loading ? (
          <View style={[styles.overlay, styles.loader]} accessibilityLabel="Chargement de la page">
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
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState={false}
        />
      </View>
    </StackChromeScreen>
  );
}

function buildStyles({ colors: c }: Theme) {
  return {
    container: { minWidth: 0, flex: 1, backgroundColor: c.background },
    webview: { minWidth: 0, flex: 1, backgroundColor: c.surface },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center' as const,
      paddingHorizontal: spacing[4],
      backgroundColor: c.background,
      zIndex: 2,
    },
    loader: { alignItems: 'center' as const },
  };
}
