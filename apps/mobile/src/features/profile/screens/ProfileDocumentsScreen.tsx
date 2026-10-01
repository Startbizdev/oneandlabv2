;
import Animated, { FadeInDown } from 'react-native-reanimated';
import { StackScrollView } from '@/components/navigation/StackScrollView';
import { ProfileDocumentsPremiumPanel } from '@/features/profile/components/ProfileDocumentsPremiumPanel';
import { StackChromeScreen } from '@/navigation/StackChromeScreen';
import { radius, spacing, AppText, useStyles, font, type Theme } from '@/theme';

/** Page dédiée documents (route /profile/documents) — patient uniquement */
export function ProfileDocumentsScreen() {
  const styles = useStyles(buildStyles);

  return (
    <StackChromeScreen>
      <StackScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ProfileDocumentsPremiumPanel />

        <Animated.View entering={FadeInDown.delay(200).duration(280).springify()} style={styles.infoBox}>
          <AppText style={styles.infoText}>
            Vos documents sont chiffrés et stockés de façon sécurisée. Seuls les professionnels de
            santé autorisés peuvent y accéder.
          </AppText>
        </Animated.View>
      </StackScrollView>
    </StackChromeScreen>
  );
}

/** Intégré dans ProfileScreen patient */
export function ProfileDocumentsEmbedded() {
  return <ProfileDocumentsPremiumPanel embedded />;
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    content: {
      padding: spacing[4],
      gap: spacing[4],
      paddingBottom: spacing[10],
    },
    infoBox: {
      backgroundColor: c.surfaceAlt,
      borderRadius: radius.lg,
      padding: spacing[4],
    },
    infoText: {
      ...font.regular,
      fontSize: fontSize.xs,
      color: c.textTertiary,
      lineHeight: fontSize.xs * 1.6,
      textAlign: 'center' as const,
    },
  };
}

