import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Bell,
  CalendarDays,
  FileText,
  HelpCircle,
  LayoutGrid,
  LifeBuoy,
  Settings,
  User,
  type LucideIcon,
} from 'lucide-react-native';
import { getHelpFaqForRole } from '@/features/help/help-faq-content';
import { ProfileNavCard } from '@/features/profile/components/ProfileNavCard';
import { ProfileNavRow } from '@/features/profile/components/ProfileNavRow';
import { useAuthStore } from '@/store/auth-store';
import { colors, spacing } from '@/theme';
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
  const router = useRouter();
  const role = useAuthStore((s) => s.user?.role);
  const faq = getHelpFaqForRole(role);

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.lead}>{faq.intro}</Text>

      {faq.sections.map((section) => (
        <ProfileNavCard key={section.slug} title={section.title}>
          {section.items.map((item, index) => (
            <View key={item.slug}>
              {index > 0 ? <View style={styles.divider} /> : null}
              <ProfileNavRow
                icon={sectionIcon(section.title)}
                title={item.question}
                subtitle={answerPreview(item.answer)}
                onPress={() => router.push(`/profile/help/${item.slug}` as never)}
                iconColor={colors.textSecondary}
                iconBg={colors.surfaceAlt}
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
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    paddingBottom: spacing[10],
    gap: spacing[4],
  },
  lead: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: fontSize.sm * 1.45,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderLight,
    marginLeft: spacing[4] + 40 + spacing[3],
  },
});
