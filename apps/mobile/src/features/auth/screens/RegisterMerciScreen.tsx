import { Image, Linking, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { ILLUSTRATIONS } from '@/constants/illustrations';
import { useToast } from '@/providers/ToastProvider';
import {
  spacing,
  useLayoutMetrics,
  responsiveValue,
  AppText,
  useStyles,
  font,
  type Theme,
} from '@/theme';

/** Adresse publiée sur la page Contact du site et utilisée par le support in-app. */
const SUPPORT_EMAIL = 'contact@cary.bio';

export function RegisterMerciScreen() {
  const layout = useLayoutMetrics();
  const styles = useStyles(buildStyles);
  const { type } = useLocalSearchParams<{ type?: string }>();
  const router = useRouter();
  const { show: toast } = useToast();
  const illustrationSize = responsiveValue(layout, { compact: 160, default: 192, wide: 224 });

  function openSupportMail() {
    Linking.openURL(`mailto:${SUPPORT_EMAIL}`).catch(() => {
      toast('Messagerie indisponible', { message: `Écrivez-nous à ${SUPPORT_EMAIL}.`, type: 'info' });
    });
  }

  const roleLabel = type === 'nurse' ? 'd’infirmier' : 'professionnel';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.content, { maxWidth: layout.contentMaxWidth }]}>
          <Image
            source={ILLUSTRATIONS.success}
            style={{ width: illustrationSize, height: illustrationSize }}
            resizeMode="contain"
            accessible={false}
          />
          <AppText variant="title" style={styles.centered} accessibilityRole="header">
            Demande envoyée
          </AppText>
          <AppText variant="secondary" style={styles.centered}>
            Nous vérifions votre dossier {roleLabel} et vous écrivons dès l’ouverture de votre accès,
            sous quelques jours ouvrés.
          </AppText>
        </View>

        <View style={[styles.actions, { maxWidth: layout.contentMaxWidth }]}>
          <Button
            title="Retour à l'accueil"
            fullWidth
            size="lg"
            onPress={() => router.replace('/(auth)/welcome')}
          />
          <Pressable
            onPress={openSupportMail}
            accessibilityRole="link"
            accessibilityHint="Ouvre votre messagerie"
            style={styles.supportLink}
          >
            <AppText variant="secondary" style={styles.centered}>
              Une question ? <AppText style={styles.supportAccent}>{SUPPORT_EMAIL}</AppText>
            </AppText>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function buildStyles({ colors: c }: Theme) {
  return {
    container: { minWidth: 0, flex: 1, backgroundColor: c.background },
    scrollContent: {
      flexGrow: 1,
      minWidth: 0,
      padding: spacing[6],
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      gap: spacing[8],
    },
    content: {
      width: '100%' as const,
      flexGrow: 1,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      gap: spacing[3],
    },
    centered: { textAlign: 'center' as const },
    actions: { width: '100%' as const, gap: spacing[2] },
    supportLink: { minHeight: 44, alignItems: 'center' as const, justifyContent: 'center' as const },
    supportAccent: { ...font.semiBold, color: c.textLink },
  };
}
