import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { AppWebViewScreen } from '@/components/web/AppWebViewScreen';
import { ErrorState } from '@/components/ui/ErrorState';
import { resolveWebPage } from '@/features/legal/utils/web-page-href';
import { StackChromeScreen } from '@/navigation/StackChromeScreen';
import { spacing, useStyles } from '@/theme';

/** Route `/(rôle)/web` : pages légales et profil public infirmier uniquement. */
export function WebPageScreen() {
  const styles = useStyles(buildStyles);
  const { page, slug } = useLocalSearchParams<{ page?: string; slug?: string }>();
  const target = resolveWebPage(page, slug);

  if (!target) {
    return (
      <StackChromeScreen>
        <View style={styles.error}>
          <ErrorState title="Page introuvable" error={new Error("Cette page n'existe pas ou plus.")} />
        </View>
      </StackChromeScreen>
    );
  }

  return <AppWebViewScreen path={target.path} title={target.title} />;
}

function buildStyles() {
  return {
    error: { flex: 1, justifyContent: 'center' as const, paddingHorizontal: spacing[4] },
  };
}
