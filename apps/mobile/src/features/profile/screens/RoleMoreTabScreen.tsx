import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { LogOut } from 'lucide-react-native';
import { MoreMenuItem, moreMenuStyles } from '@/features/profile/components/MoreMenuItem';
import { MoreProfileCard } from '@/features/profile/components/MoreProfileCard';
import { useAuthStore } from '@/store/auth-store';
import { colors, elevation, spacing } from '@/theme';
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
            style={moreMenuStyles.section}
          >
            {section.title ? (
              <Animated.Text style={moreMenuStyles.sectionTitle}>{section.title}</Animated.Text>
            ) : null}
            <View style={[moreMenuStyles.sectionCard, elevation.xs]}>
              {section.items.map((item, itemIndex) => (
                <View key={item.label}>
                  {itemIndex > 0 ? <View style={moreMenuStyles.divider} /> : null}
                  <MoreMenuItem {...item} />
                </View>
              ))}
            </View>
          </Animated.View>
        ))}

        <Animated.View
          entering={FadeInDown.delay(logoutDelay).duration(400).springify()}
          style={moreMenuStyles.section}
        >
          <View style={[moreMenuStyles.sectionCard, elevation.xs]}>
            <MoreMenuItem
              icon={LogOut}
              label="Déconnexion"
              destructive
              onPress={async () => {
                await logout();
                router.replace('/(auth)/login');
              }}
            />
          </View>
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
