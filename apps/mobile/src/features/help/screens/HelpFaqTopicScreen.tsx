import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import {
  buildTabSceneScrollConfig,
  spreadTabSceneScrollProps,
  useTabSceneInsets,
} from '@/components/navigation/liquid-glass-header-inset';
import { StackChromeScreen } from '@/navigation/StackChromeScreen';
import { findHelpFaqTopic } from '@/features/help/help-faq-content';
import { useAuthStore } from '@/store/auth-store';
import { spacing, AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

export function HelpFaqTopicScreen() {
  const styles = useThemedStyles(buildStyles, 'features_help_screens_HelpFaqTopicScreen_tsx_HelpFaqTopicScreen_styles');

  const { slug } = useLocalSearchParams<{ slug: string }>();
  const role = useAuthStore((s) => s.user?.role);
  const topic = slug ? findHelpFaqTopic(role, slug) : null;
  const sceneInsets = useTabSceneInsets();
  const scrollConfig = buildTabSceneScrollConfig(sceneInsets, styles.scroll);

  if (!topic) {
    return (
      <StackChromeScreen>
        <ScrollView
          {...spreadTabSceneScrollProps(scrollConfig)}
          contentContainerStyle={scrollConfig.contentContainerStyle}
        >
          <AppText style={styles.missing}>Cette rubrique d’aide est introuvable.</AppText>
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
        <AppText style={styles.question}>{topic.question}</AppText>
        <AppText style={styles.answer}>{topic.answer}</AppText>
      </ScrollView>
    </StackChromeScreen>
  );
}

function buildStyles(c: AppColors) {
  return {
  scroll: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    paddingBottom: spacing[10],
    gap: spacing[4],
  },
  question: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.lg,
    color: c.textPrimary,
    lineHeight: fontSize.lg * 1.35,
  },
  answer: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
    color: c.textSecondary,
    lineHeight: fontSize.base * 1.55,
  },
  missing: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: c.textSecondary,
    lineHeight: fontSize.sm * 1.45,
  },
};
}
