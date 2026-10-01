import { View } from 'react-native';
import { TabSceneScrollView } from '@/components/navigation/TabSceneScrollView';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { LogOut } from 'lucide-react-native';
import { SettingsSection } from '@/components/ui/SettingsSection';
import { MoreProfileCard } from '@/features/profile/components/MoreProfileCard';
import { useAuthStore } from '@/store/auth-store';
import { spacing, useStyles, type Theme } from '@/theme';
import type { SettingsRowProps } from '@/components/ui/SettingsRow';

export type MoreTabSection = {
  title?: string;
  items: SettingsRowProps[];
  /** Délai d’entrée FadeInDown (ms). */
  delay?: number;
};

interface Props {
  roleLabel: string;
  profileSubtitle?: string;
  sections: MoreTabSection[];
  /** Délai section déconnexion. */
  logoutDelay?: number;
}

export function RoleMoreTabScreen({
  roleLabel,
  profileSubtitle,
  sections,
  logoutDelay = 330,
}: Props) {
  const styles = useStyles(buildStyles);

  const router = useRouter();
  const logout = useAuthStore((s) => s.clearSession);

  return (
    <View style={styles.container}>
      <TabSceneScrollView
        contentContainerStyle={styles.scroll}
        scrollPaddingOptions={{ extraTop: spacing[4] }}
      >
        <MoreProfileCard
          roleLabel={roleLabel}
          subtitle={profileSubtitle}
          onPress={() => router.push('/profile')}
        />

        {sections.map((section, sectionIndex) => (
          <Animated.View
            key={section.title ?? `section-${sectionIndex}`}
            entering={FadeInDown.delay(section.delay ?? 150 + sectionIndex * 60)
              .duration(400)
              .springify()}
          >
            <SettingsSection title={section.title} items={section.items} />
          </Animated.View>
        ))}

        <Animated.View entering={FadeInDown.delay(logoutDelay).duration(400).springify()}>
          <SettingsSection
            items={[
              {
                icon: LogOut,
                label: 'Déconnexion',
                destructive: true,
                onPress: async () => {
                  await logout();
                  router.replace('/(auth)/login');
                },
              },
            ]}
          />
        </Animated.View>
      </TabSceneScrollView>
    </View>
  );
}

function buildStyles({ colors: c }: Theme) {
  return {
  container: { minWidth: 0, flex: 1, backgroundColor: c.background },
  scroll: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[10],
    gap: spacing[4],
  },
};
}
