import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { LogOut } from 'lucide-react-native';
import { MoreMenuSection } from '@/features/profile/components/MoreMenuSection';
import { MoreProfileCard } from '@/features/profile/components/MoreProfileCard';
import { useAuthStore } from '@/store/auth-store';
import { colors, spacing } from '@/theme';
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
  const router = useRouter();
  const logout = useAuthStore((s) => s.clearSession);

  return (
    <View style={styles.container}>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[8],
    gap: spacing[4],
    paddingTop: spacing[4],
  },
});
