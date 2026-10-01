import { SceneScrollView } from '@/components/navigation/SceneScrollView';
import { ProfileDocumentsPremiumPanel } from '@/features/profile/components/ProfileDocumentsPremiumPanel';
import { StackChromeScreen } from '@/navigation/StackChromeScreen';
import { spacing, AppText, useStyles } from '@/theme';

/** Page dédiée documents (route /profile/documents) — patient uniquement */
export function ProfileDocumentsScreen() {
  const styles = useStyles(buildStyles);

  return (
    <StackChromeScreen>
      <SceneScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ProfileDocumentsPremiumPanel />
        <AppText variant="caption" style={styles.footer}>
          Vos documents sont chiffrés. Seuls les professionnels de santé autorisés peuvent y accéder.
        </AppText>
      </SceneScrollView>
    </StackChromeScreen>
  );
}

function buildStyles() {
  return {
    content: {
      padding: spacing[4],
      gap: spacing[4],
      paddingBottom: spacing[10],
    },
    footer: {
      textAlign: 'center' as const,
      paddingHorizontal: spacing[4],
    },
  };
}
