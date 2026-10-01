import { ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { HelpCircle } from 'lucide-react-native';
import {
  buildTabSceneScrollConfig,
  spreadTabSceneScrollProps,
  useTabSceneInsets,
} from '@/components/navigation/liquid-glass-header-inset';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { StackChromeScreen } from '@/navigation/StackChromeScreen';
import { findHelpFaqTopic } from '@/features/help/help-faq-content';
import { useAuthStore } from '@/store/auth-store';
import { radius, spacing, AppText, useStyles, font, type Theme } from '@/theme';

export function HelpFaqTopicScreen() {
  const styles = useStyles(buildStyles);
  const router = useRouter();

  const { slug } = useLocalSearchParams<{ slug: string }>();
  const role = useAuthStore((s) => s.user?.role);
  const topic = slug ? findHelpFaqTopic(role, slug) : null;
  const sceneInsets = useTabSceneInsets();
  const scrollConfig = buildTabSceneScrollConfig(sceneInsets, styles.scroll);

  const backToHelp = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/profile/help' as never);
  };

  if (!topic) {
    return (
      <StackChromeScreen>
        <ScrollView
          {...spreadTabSceneScrollProps(scrollConfig)}
          contentContainerStyle={scrollConfig.contentContainerStyle}
        >
          <EmptyState
            Icon={HelpCircle}
            title="Rubrique introuvable"
            description="Cette question n’existe plus ou a été déplacée."
            actionLabel="Retour à l’aide"
            onAction={backToHelp}
          />
        </ScrollView>
      </StackChromeScreen>
    );
  }

  return (
    <StackChromeScreen>
      <ScrollView
        {...spreadTabSceneScrollProps(scrollConfig)}
        contentContainerStyle={scrollConfig.contentContainerStyle}
        showsVerticalScrollIndicator={false}
      >
        <AppText style={styles.question} accessibilityRole="header">
          {topic.question}
        </AppText>
        <AppText style={styles.answer}>{topic.answer}</AppText>

        <View style={styles.supportCard}>
          <AppText style={styles.supportTitle}>Cette réponse ne vous aide pas ?</AppText>
          <AppText style={styles.supportText}>Écrivez-nous, nous vous répondrons par e-mail.</AppText>
          <Button
            title="Contacter le support"
            variant="secondary"
            onPress={() => router.push('/profile/support' as never)}
          />
        </View>
      </ScrollView>
    </StackChromeScreen>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    scroll: {
      paddingHorizontal: spacing[4],
      paddingTop: spacing[4],
      paddingBottom: spacing[10],
      gap: spacing[4],
    },
    question: {
      ...font.headingSemiBold,
      fontSize: fontSize.lg,
      color: c.textPrimary,
      lineHeight: fontSize.lg * 1.35,
    },
    answer: {
      ...font.regular,
      fontSize: fontSize.base,
      color: c.textSecondary,
      lineHeight: fontSize.base * 1.55,
    },
    supportCard: {
      marginTop: spacing[4],
      padding: spacing[4],
      gap: spacing[2],
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: c.borderLight,
      backgroundColor: c.surface,
    },
    supportTitle: {
      ...font.semiBold,
      fontSize: fontSize.base,
      color: c.textPrimary,
    },
    supportText: {
      ...font.regular,
      fontSize: fontSize.sm,
      color: c.textSecondary,
      marginBottom: spacing[1],
    },
  };
}
