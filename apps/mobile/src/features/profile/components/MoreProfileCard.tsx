import type { AppColors } from '@/theme/colors';
import { hexToRgba } from '@/theme/color-utils';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Cluster } from '@/components/layout/primitives';
import { useQuery } from '@tanstack/react-query';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '@/store/auth-store';
import { fetchUser } from '@/features/profile/api/profile.service';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { queryKeys } from '@/lib/query-keys';
import { elevation, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  roleLabel: string;
  onPress: () => void;
  /** Sous-titre optionnel (ex. e-mail pro). */
  subtitle?: string;
  delay?: number;
}

/** Carte profil premium pour les onglets « Plus » — photo / logo si disponible. */
export function MoreProfileCard({ roleLabel, onPress, subtitle, delay = 80 }: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'features_profile_components_MoreProfileCard_tsx_styles');
  const user = useAuthStore((s) => s.user);

  const profileQ = useQuery({
    queryKey: queryKeys.profile.user(user?.id ?? ''),
    queryFn: async () => {
      const res = await fetchUser(user!.id);
      return res.data;
    },
    enabled: Boolean(user?.id),
    staleTime: 60_000,
  });

  const rawImage =
    profileQ.data?.profile_image_url ??
    user?.profile_image_url ??
    user?.avatar ??
    null;
  const name =
    `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim() || 'Mon compte';
  const avatarSeed = user?.id ?? name;

  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(400).springify()}>
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed, elevation.sm]}
        accessibilityRole="button"
        accessibilityLabel={`Profil de ${name}`}
      >
        <LinearGradient
          colors={[c.primaryLight, c.surface]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <View style={styles.accent} />
          <Cluster
            gap={spacing[3.5]}
            leading={
              <ProfileAvatar
                profileImageUrl={rawImage}
                seed={avatarSeed}
                gender={profileQ.data?.gender}
                size={56}
                style={styles.avatarRing}
              />
            }
            actions={
              <View style={styles.chevronWrap}>
                <ChevronRight size={18} color={c.textTertiary} strokeWidth={2} />
              </View>
            }
            style={styles.row}
          >
            <View style={styles.info}>
              <Text style={styles.name} numberOfLines={1}>
                {name}
              </Text>
              <View style={styles.rolePill}>
                <Text style={styles.roleText}>{roleLabel}</Text>
              </View>
              {subtitle ? (
                <Text style={styles.subtitle} numberOfLines={1}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
          </Cluster>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

const AVATAR = 58;

function buildStyles(c: AppColors) {
  return {
  card: {
    borderRadius: radius['2xl'],
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.cardBorder,
    overflow: 'hidden' as const,
    backgroundColor: c.surface,
  },
  cardPressed: {
    opacity: 0.92,
  },
  gradient: {
    padding: spacing[4],
    position: 'relative' as const,
  },
  accent: {
    position: 'absolute' as const,
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: c.primary,
    borderTopLeftRadius: radius['2xl'],
    borderBottomLeftRadius: radius['2xl'],
  },
  row: {
    paddingLeft: spacing[1],
  },
  avatarRing: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    borderWidth: 2.5,
    borderColor: c.surface,
    backgroundColor: c.primaryLight,
    overflow: 'hidden' as const,
    shadowColor: c.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
    flexShrink: 0,
  },
  info: {
    gap: spacing[1],
  },
  name: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    color: c.textPrimary,
    letterSpacing: -0.35,
  },
  rolePill: {
    alignSelf: 'flex-start' as const,
    paddingHorizontal: spacing[2.5],
    paddingVertical: 3,
    borderRadius: radius.full,
    backgroundColor: hexToRgba(c.primary, 0.1),
    borderWidth: 1,
    borderColor: hexToRgba(c.primary, 0.18),
  },
  roleText: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: c.primaryDark,
    letterSpacing: 0.2,
  },
  subtitle: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: c.textSecondary,
    marginTop: 2,
  },
  chevronWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: c.surfaceAlt,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexShrink: 0,
  },
};
}

