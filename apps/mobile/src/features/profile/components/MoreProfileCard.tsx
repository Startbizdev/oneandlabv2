import { Pressable, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react-native';
import { ListRowShell } from '@/components/ui/ListRowShell';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { fetchUser } from '@/features/profile/api/profile.service';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/store/auth-store';
import {
  AppText,
  ICON_STROKE_WIDTH,
  avatarSize,
  iconSize,
  radius,
  spacing,
  useAppColors,
  useStyles,
  font,
  type Theme,
} from '@/theme';

interface Props {
  roleLabel: string;
  onPress: () => void;
}

/** En-tête des onglets « Plus » : identité du compte, ouvre « Mon profil ». */
export function MoreProfileCard({ roleLabel, onPress }: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const user = useAuthStore((s) => s.user);

  const profileQ = useQuery({
    queryKey: queryKeys.profile.user(user?.id ?? ''),
    queryFn: async () => (await fetchUser(user!.id)).data,
    enabled: Boolean(user?.id),
    staleTime: 60_000,
  });

  const image = profileQ.data?.profile_image_url ?? user?.profile_image_url ?? user?.avatar ?? null;
  const name = `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim() || 'Mon compte';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${roleLabel}`}
      accessibilityHint="Ouvre votre profil"
    >
      <ListRowShell
        style={styles.row}
        leading={
          <ProfileAvatar
            profileImageUrl={image}
            seed={user?.id ?? name}
            gender={profileQ.data?.gender}
            size={avatarSize.md}
          />
        }
        body={
          <View style={styles.texts}>
            <AppText style={styles.name}>{name}</AppText>
            <AppText variant="secondary">{roleLabel}</AppText>
          </View>
        }
        trailing={
          <ChevronRight size={iconSize.sm} color={c.textTertiary} strokeWidth={ICON_STROKE_WIDTH} />
        }
      />
    </Pressable>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    card: {
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.cardBorder,
      overflow: 'hidden' as const,
    },
    pressed: { backgroundColor: c.surfaceAlt },
    row: { paddingVertical: spacing[4] },
    texts: { gap: spacing[0.5] },
    name: {
      ...font.heading,
      fontSize: fontSize.lg,
      color: c.textPrimary,
    },
  };
}
