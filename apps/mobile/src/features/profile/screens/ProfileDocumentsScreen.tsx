import type { AppColors } from '@/theme/colors';
import { getThemedStyles } from '@/theme/use-themed-styles';
import { ScrollView, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ProfileDocumentsPremiumPanel } from '@/features/profile/components/ProfileDocumentsPremiumPanel';
import { radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

/** Page dédiée documents (route /profile/documents) — patient uniquement */
export function ProfileDocumentsScreen() {
  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        <ProfileDocumentsPremiumPanel />

        <Animated.View entering={FadeInDown.delay(200).duration(280).springify()} style={styles.infoBox}>
          <Text style={styles.infoText}>
            Vos documents sont chiffrés et stockés de façon sécurisée. Seuls les professionnels de
            santé autorisés peuvent y accéder.
          </Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

/** Intégré dans ProfileScreen patient */
export function ProfileDocumentsEmbedded() {
  return <ProfileDocumentsPremiumPanel embedded />;
}

function buildStyles(c: AppColors) {
  return {
    container: { flex: 1, backgroundColor: c.background },
    scroll: { flex: 1 },
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
      fontFamily: fontFamily.regular,
      fontSize: fontSize.xs,
      color: c.textTertiary,
      lineHeight: fontSize.xs * 1.6,
      textAlign: 'center' as const,
    },
  };
}

const styles = new Proxy({} as Record<string, object>, {
  get(_target, prop: string | symbol) {
    if (typeof prop === 'string') {
      return getThemedStyles('features_profile_screens_ProfileDocumentsScreen_tsx_styles', buildStyles)[
        prop
      ];
    }
    return undefined;
  },
});
