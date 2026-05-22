import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '@/store/auth-store';
import { fetchUser } from '@/features/profile/api/profile.service';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { queryKeys } from '@/lib/query-keys';
import { colors, elevation, radius, spacing } from '@/theme';
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
          colors={['#ECFDF9', '#FFFFFF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <View style={styles.accent} />
          <View style={styles.row}>
            <ProfileAvatar
              profileImageUrl={rawImage}
              seed={avatarSeed}
              gender={profileQ.data?.gender}
              size={56}
              style={styles.avatarRing}
            />

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

            <View style={styles.chevronWrap}>
              <ChevronRight size={18} color={colors.textTertiary} strokeWidth={2} />
            </View>
          </View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

const AVATAR = 58;

const styles = StyleSheet.create({
  card: {
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  cardPressed: {
    opacity: 0.92,
  },
  gradient: {
    padding: spacing[4],
    position: 'relative',
  },
  accent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: colors.primary,
    borderTopLeftRadius: radius['2xl'],
    borderBottomLeftRadius: radius['2xl'],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3.5],
    paddingLeft: spacing[1],
  },
  avatarRing: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    borderWidth: 2.5,
    borderColor: colors.surface,
    backgroundColor: colors.primaryLight,
    overflow: 'hidden',
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
    flexShrink: 0,
  },
  info: {
    flex: 1,
    gap: spacing[1],
    minWidth: 0,
  },
  name: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    color: colors.textPrimary,
    letterSpacing: -0.35,
  },
  rolePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing[2.5],
    paddingVertical: 3,
    borderRadius: radius.full,
    backgroundColor: 'rgba(13, 148, 136, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(13, 148, 136, 0.18)',
  },
  roleText: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize['2xs'],
    color: colors.primaryDark,
    letterSpacing: 0.2,
  },
  subtitle: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  chevronWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
