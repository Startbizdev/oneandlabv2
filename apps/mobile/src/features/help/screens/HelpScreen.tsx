import { useMemo, useState } from 'react';
import { Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { LifeBuoy, Search, Sparkles, X } from 'lucide-react-native';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { StackChromeScreen } from '@/navigation/StackChromeScreen';
import { getOnboardingHref } from '@/features/onboarding/utils/onboarding-route';
import { isTutorialRole } from '@oneandlab/onboarding';
import { getHelpFaqForRole, searchHelpFaq, type HelpFaqItem } from '@/features/help/help-faq-content';
import { SettingsSection } from '@/components/ui/SettingsSection';
import { useAuthStore } from '@/store/auth-store';
import { useAppColors } from '@/theme/use-app-colors';
import { iconSize, ICON_STROKE_WIDTH, spacing, AppText, useStyles } from '@/theme';

export function HelpScreen() {
  const c = useAppColors();
  const styles = useStyles(buildStyles);

  const router = useRouter();
  const role = useAuthStore((s) => s.user?.role);
  const faq = useMemo(() => getHelpFaqForRole(role), [role]);
  const [query, setQuery] = useState('');
  const searching = query.trim().length > 0;
  const results = useMemo(() => searchHelpFaq(faq, query), [faq, query]);

  const openTopic = (item: HelpFaqItem) =>
    router.push({ pathname: '/profile/help/[slug]', params: { slug: item.slug } });
  const openSupport = () => router.push('/profile/support');

  const topicRows = (items: HelpFaqItem[]) =>
    items.map((item) => ({ label: item.question, onPress: () => openTopic(item) }));

  return (
    <StackChromeScreen>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <AppText variant="secondary">{faq.intro}</AppText>

        <Input
          value={query}
          onChangeText={setQuery}
          placeholder="Rechercher une question"
          accessibilityLabel="Rechercher dans l’aide"
          returnKeyType="search"
          autoCorrect={false}
          leftIcon={<Search size={iconSize.md} color={c.textTertiary} strokeWidth={ICON_STROKE_WIDTH} />}
          rightIcon={
            searching ? (
              <Pressable
                onPress={() => setQuery('')}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Effacer la recherche"
              >
                <X size={iconSize.md} color={c.textTertiary} strokeWidth={ICON_STROKE_WIDTH} />
              </Pressable>
            ) : undefined
          }
        />

        {searching ? (
          results.length > 0 ? (
            <SettingsSection
              iconless
              title={`${results.length} réponse${results.length > 1 ? 's' : ''}`}
              items={topicRows(results)}
            />
          ) : (
            <EmptyState
              illustration="search"
              title="Aucune réponse trouvée"
              description="Essayez un autre mot, ou écrivez-nous."
              actionLabel="Contacter le support"
              onAction={openSupport}
            />
          )
        ) : (
          <>
            {role && isTutorialRole(role) ? (
              <SettingsSection
                items={[
                  {
                    icon: Sparkles,
                    label: 'Revoir le guide de démarrage',
                    onPress: () => router.push(getOnboardingHref(role, true)),
                  },
                ]}
              />
            ) : null}

            {faq.sections.map((section) => (
              <SettingsSection
                key={section.slug}
                iconless
                title={section.title}
                items={topicRows(section.items)}
              />
            ))}

            <SettingsSection items={[{ icon: LifeBuoy, label: 'Contacter le support', onPress: openSupport }]} />
          </>
        )}
      </ScrollView>
    </StackChromeScreen>
  );
}

function buildStyles() {
  return {
    scroll: {
      paddingHorizontal: spacing[4],
      paddingTop: spacing[4],
      paddingBottom: spacing[10],
      gap: spacing[6],
    },
  };
}
