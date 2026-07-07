import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { ScrollView, StyleSheet, View } from 'react-native';
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
  Settings,
  Sparkles,
  User,
  type LucideIcon,
} from 'lucide-react-native';
import { getOnboardingHref } from '@/features/onboarding/utils/onboarding-route';
import { isTutorialRole } from '@oneandlab/onboarding';
import { getHelpFaqForRole, type HelpFaqItem } from '@/features/help/help-faq-content';
import { ProfileNavCard } from '@/features/profile/components/ProfileNavCard';
import { ProfileNavRow } from '@/features/profile/components/ProfileNavRow';
import { useAuthStore } from '@/store/auth-store';
import { spacing, AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

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
  const styles = useThemedStyles(buildStyles, 'features_help_screens_HelpScreen_tsx_HelpScreen_styles');

  const router = useRouter();
  const role = useAuthStore((s) => s.user?.role);
  const faq = getHelpFaqForRole(role);
  const sceneInsets = useTabSceneInsets();
  const scrollConfig = buildTabSceneScrollConfig(sceneInsets, styles.scroll);

  return (
    <StackChromeScreen>
      <ScrollView
        {...spreadTabSceneScrollProps(scrollConfig)}
        contentContainerStyle={scrollConfig.contentContainerStyle}
        showsVerticalScrollIndicator={false}
      >
      <AppText style={styles.lead}>{faq.intro}</AppText>

      {role && isTutorialRole(role) ? (
        <ProfileNavCard title="Prise en main">
          <ProfileNavRow
            icon={Sparkles}
            title="Découvrir Cary en 2 minutes"
            subtitle="Revoir le tutoriel de démarrage avec les onglets principaux."
            onPress={() => router.push(getOnboardingHref(role, true) as never)}
            iconColor={c.primary}
            iconBg={c.primaryLight}
          />
        </ProfileNavCard>
      ) : null}

      {faq.sections.map((section) => (
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

function buildStyles(c: AppColors) {
  return {
  scroll: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    paddingBottom: spacing[10],
    gap: spacing[4],
  },
  lead: {
    fontFamily: fontFamily.regular,
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
