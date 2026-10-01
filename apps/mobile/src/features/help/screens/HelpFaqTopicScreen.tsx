import { ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { StackChromeScreen } from '@/navigation/StackChromeScreen';
import { findHelpFaqTopic } from '@/features/help/help-faq-content';
import { useAuthStore } from '@/store/auth-store';
import { spacing, AppText, useStyles, font, type Theme } from '@/theme';

export function HelpFaqTopicScreen() {
  const styles = useStyles(buildStyles);
  const router = useRouter();

  const { slug } = useLocalSearchParams<{ slug: string }>();
  const role = useAuthStore((s) => s.user?.role);
  const topic = slug ? findHelpFaqTopic(role, slug) : null;

  const backToHelp = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/profile/help');
  };

  if (!topic) {
    return (
      <StackChromeScreen>
        <ScrollView contentContainerStyle={styles.scroll}>
          <EmptyState
            illustration="search"
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
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <AppText variant="title" accessibilityRole="header">
          {topic.question}
        </AppText>
        <AppText style={styles.answer}>{topic.answer}</AppText>

        <View style={styles.support}>
          <AppText variant="caption">Cette réponse ne vous aide pas ?</AppText>
          <Button
            title="Contacter le support"
            variant="secondary"
            onPress={() => router.push('/profile/support')}
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
    answer: {
      ...font.regular,
      fontSize: fontSize.base,
      color: c.textSecondary,
      lineHeight: fontSize.base * 1.55,
    },
    support: {
      marginTop: spacing[6],
      gap: spacing[2],
    },
  };
}
