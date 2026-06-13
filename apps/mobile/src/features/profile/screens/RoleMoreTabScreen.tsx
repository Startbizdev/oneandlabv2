import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { LogOut } from 'lucide-react-native';
import { MoreMenuSection } from '@/features/profile/components/MoreMenuSection';
import { MoreProfileCard } from '@/features/profile/components/MoreProfileCard';
import { useAuthStore } from '@/store/auth-store';
import { useAppPreferencesStore } from '@/store/app-preferences-store';
import { spacing } from '@/theme';
import type { MoreMenuItemProps } from '@/features/profile/components/MoreMenuItem';

export type MoreTabSection = {
  title?: string;
  items: MoreMenuItemProps[];
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
  const styles = useThemedStyles(buildStyles, 'features_profile_screens_RoleMoreTabScreen_tsx_RoleMoreTabScreen_styles');

  const router = useRouter();
  const logout = useAuthStore((s) => s.clearSession);
  const colorblindType = useAppPreferencesStore((s) => s.colorblindType);
  const textScale = useAppPreferencesStore((s) => s.textScale);

  return (
    <View style={styles.container} key={`${colorblindType}:${textScale}`}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
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
            <MoreMenuSection title={section.title} items={section.items} />
          </Animated.View>
        ))}

        <Animated.View entering={FadeInDown.delay(logoutDelay).duration(400).springify()}>
          <MoreMenuSection
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
      </ScrollView>
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
  container: { minWidth: 0, flex: 1, backgroundColor: c.surface },
  scroll: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    paddingBottom: spacing[10],
    gap: spacing[4],
  },
};
}
