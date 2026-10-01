import { useAppColors } from '@/theme/use-app-colors';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import {
  buildTabSceneScrollConfig,
  spreadTabSceneScrollProps,
  useTabSceneInsets,
} from '@/components/navigation/liquid-glass-header-inset';
import { StackChromeScreen } from '@/navigation/StackChromeScreen';
import { useRouter } from 'expo-router';
import {
  Bell,
  CalendarDays,
  FileText,
  HelpCircle,
  LayoutGrid,
  LifeBuoy,
  Search,
  Settings,
  Sparkles,
  User,
  X,
  type LucideIcon,
} from 'lucide-react-native';
import { getOnboardingHref } from '@/features/onboarding/utils/onboarding-route';
import { isTutorialRole } from '@oneandlab/onboarding';
import { getHelpFaqForRole, searchHelpFaq, type HelpFaqItem } from '@/features/help/help-faq-content';
import { ProfileNavCard } from '@/features/profile/components/ProfileNavCard';
import { ProfileNavRow } from '@/features/profile/components/ProfileNavRow';
import { useAuthStore } from '@/store/auth-store';
import { iconSize, spacing, AppText, useStyles, font, type Theme } from '@/theme';

const SECTION_ICONS: Record<string, LucideIcon> = {
  'Onglets principaux': LayoutGrid,
  'Menu Plus — Mon compte': User,
  'Menu Plus — Professionnel': User,
  'Menu Plus': User,
  'Détail d’un rendez-vous (patient)': CalendarDays,
  'Détail d’un rendez-vous (infirmier)': CalendarDays,
  'Détail d’un rendez-vous (professionnel)': CalendarDays,
  'Détail d’un rendez-vous (préleveur)': CalendarDays,
  Notifications: Bell,
  'Paramètres et sécurité': Settings,
  'Documents médicaux': FileText,
};

function sectionIcon(title: string): LucideIcon {
  return SECTION_ICONS[title] ?? HelpCircle;
}

function answerPreview(answer: string, max = 72): string {
  const oneLine = answer.replace(/\s+/g, ' ').trim();
  if (oneLine.length <= max) return oneLine;
  return `${oneLine.slice(0, max - 1).trim()}…`;
}

export function HelpScreen() {
  const c = useAppColors();
  const styles = useStyles(buildStyles);

  const router = useRouter();
  const role = useAuthStore((s) => s.user?.role);
  const faq = useMemo(() => getHelpFaqForRole(role), [role]);
  const [query, setQuery] = useState('');
  const searching = query.trim().length > 0;
  const results = useMemo(() => searchHelpFaq(faq, query), [faq, query]);
  const sceneInsets = useTabSceneInsets();
  const scrollConfig = buildTabSceneScrollConfig(sceneInsets, styles.scroll);

  return (
    <StackChromeScreen>
      <ScrollView
        {...spreadTabSceneScrollProps(scrollConfig)}
        contentContainerStyle={scrollConfig.contentContainerStyle}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
      <AppText style={styles.lead}>{faq.intro}</AppText>

      <Input
        value={query}
        onChangeText={setQuery}
        placeholder="Rechercher une question"
        accessibilityLabel="Rechercher dans l’aide"
        returnKeyType="search"
        autoCorrect={false}
        leftIcon={<Search size={iconSize.sm} color={c.textTertiary} strokeWidth={2} />}
        rightIcon={
          searching ? (
            <Pressable
              onPress={() => setQuery('')}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Effacer la recherche"
            >
              <X size={iconSize.sm} color={c.textTertiary} strokeWidth={2} />
            </Pressable>
          ) : undefined
        }
      />

      {searching ? (
        results.length > 0 ? (
          <ProfileNavCard title={`${results.length} réponse${results.length > 1 ? 's' : ''}`}>
            {results.map((item, index) => (
              <View key={item.slug}>
                {index > 0 ? <View style={styles.divider} /> : null}
                <ProfileNavRow
                  icon={HelpCircle}
                  title={item.question}
                  subtitle={answerPreview(item.answer)}
                  onPress={() => router.push(`/profile/help/${item.slug}` as never)}
                  iconColor={c.textSecondary}
                  iconBg={c.surfaceAlt}
                />
              </View>
            ))}
          </ProfileNavCard>
        ) : (
          <EmptyState
            Icon={Search}
            title="Aucune réponse trouvée"
            description="Essayez un autre mot, ou écrivez-nous : nous vous répondrons."
            actionLabel="Contacter le support"
            onAction={() => router.push('/profile/support' as never)}
          />
        )
      ) : null}

      {!searching && role && isTutorialRole(role) ? (
        <ProfileNavCard title="Prise en main">
          <ProfileNavRow
            icon={Sparkles}
            title="Revoir le guide de démarrage"
            subtitle="Deux minutes pour voir ce que vous pouvez faire."
            onPress={() => router.push(getOnboardingHref(role, true) as never)}
            iconColor={c.primary}
            iconBg={c.primaryLight}
          />
        </ProfileNavCard>
      ) : null}

      {!searching && faq.sections.map((section) => (
        <ProfileNavCard key={section.slug} title={section.title}>
          {section.items.map((item: HelpFaqItem, index) => (
            <View key={item.slug}>
              {index > 0 ? <View style={styles.divider} /> : null}
              <ProfileNavRow
                icon={sectionIcon(section.title)}
                title={item.question}
                subtitle={answerPreview(item.answer)}
                onPress={() => router.push(`/profile/help/${item.slug}` as never)}
                iconColor={c.textSecondary}
                iconBg={c.surfaceAlt}
              />
            </View>
          ))}
        </ProfileNavCard>
      ))}

      <ProfileNavCard title="Support">
        <ProfileNavRow
          icon={LifeBuoy}
          title="Contacter le support"
          subtitle="Une question sans réponse ? Écrivez-nous — vos infos compte sont jointes."
          onPress={() => router.push('/profile/support' as never)}
        />
      </ProfileNavCard>
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
  lead: {
    ...font.regular,
    fontSize: fontSize.sm,
    color: c.textSecondary,
    lineHeight: fontSize.sm * 1.45,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: c.borderLight,
    marginLeft: spacing[4] + 40 + spacing[3],
  },
};
}
