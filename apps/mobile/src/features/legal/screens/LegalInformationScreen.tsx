import { ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { LEGAL_PAGES } from '@/constants/legal-pages';
import { SettingsSection } from '@/components/ui/SettingsSection';
import { StackChromeScreen } from '@/navigation/StackChromeScreen';
import { webPageHref } from '@/features/legal/utils/web-page-href';
import type { RoleRoutePrefix } from '@/navigation/role-route-prefix';
import { spacing, useStyles } from '@/theme';

interface Props {
  /** Préfixe de route expo, ex. `/(nurse)` */
  rolePrefix: RoleRoutePrefix;
}

export function LegalInformationScreen({ rolePrefix }: Props) {
  const styles = useStyles(buildStyles);
  const router = useRouter();

  return (
    <StackChromeScreen>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <SettingsSection
          iconless
          items={LEGAL_PAGES.map((page) => ({
            label: page.label,
            description: page.description,
            onPress: () => router.push(webPageHref(rolePrefix, { kind: 'legal', slug: page.slug })),
          }))}
        />
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
    },
  };
}
