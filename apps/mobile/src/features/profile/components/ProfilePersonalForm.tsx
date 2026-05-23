import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SkeletonList } from '@/components/ui/skeletons';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/providers/ToastProvider';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { fetchUser, updateUser } from '../api/profile.service';
import { colors, elevation, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  /** Afficher le bouton Enregistrer sous le formulaire */
  showSaveButton?: boolean;
}

export function ProfilePersonalForm({ showSaveButton = true }: Props) {
  const user = useAuthStore((s) => s.user);
  const { show: toast } = useToast();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');

  const q = useQuery({
    queryKey: queryKeys.profile.user(user?.id ?? ''),
    queryFn: async () => {
      const res = await fetchUser(user!.id);
      return res.data;
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (q.data) {
      setFirstName(q.data.first_name ?? '');
      setLastName(q.data.last_name ?? '');
      setPhone((q.data as { phone?: string }).phone ?? '');
    }
  }, [q.data]);

  const save = useMutation({
    mutationFn: () => updateUser(user!.id, { first_name: firstName, last_name: lastName, phone }),
    onSuccess: () => toast('Profil mis à jour', { type: 'success' }),
    onError: (e) => handleApiError(e, toast, 'updateUser'),
  });

  return (
    <>
      <Animated.View entering={FadeInDown.duration(280).springify()} style={styles.avatarSection}>
        <ProfileAvatar
          profileImageUrl={
            (q.data as { profile_image_url?: string | null } | undefined)?.profile_image_url ??
            user?.profile_image_url
          }
          seed={user?.id ?? `${firstName} ${lastName}`}
          gender={(q.data as { gender?: string | null } | undefined)?.gender}
          size={64}
          style={styles.avatar}
        />
        <View style={styles.avatarInfo}>
          <Text style={styles.avatarName}>
            {firstName || lastName ? `${firstName} ${lastName}`.trim() : 'Votre profil'}
          </Text>
          <Text style={styles.avatarEmail}>{user?.email ?? ''}</Text>
        </View>
      </Animated.View>

      {q.isLoading ? (
        <SkeletonList count={3} itemHeight={72} gap={spacing[3]} />
      ) : (
        <Animated.View entering={FadeInDown.delay(80).duration(280).springify()} style={[styles.formCard, elevation.xs]}>
          <Text style={styles.sectionTitle}>Informations personnelles</Text>
          <Input
            label="Prénom"
            value={firstName}
            onChangeText={setFirstName}
            autoCapitalize="words"
            returnKeyType="next"
          />
          <Input
            label="Nom"
            value={lastName}
            onChangeText={setLastName}
            autoCapitalize="words"
            returnKeyType="next"
          />
          <Input
            label="Téléphone"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            returnKeyType="done"
          />
          {user?.role === 'patient' ? (
            <Text style={styles.hint}>
              L’e-mail ne peut pas être modifié depuis l’application. Contactez le support si besoin.
            </Text>
          ) : null}
        </Animated.View>
      )}

      {showSaveButton ? (
        <Animated.View entering={FadeInDown.delay(160).duration(280).springify()}>
          <Button
            title="Enregistrer les modifications"
            loading={save.isPending}
            onPress={() => save.mutate()}
            fullWidth
            size="lg"
          />
        </Animated.View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  avatarSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    paddingTop: spacing[2],
  },
  avatar: {
    borderWidth: 2,
    borderColor: colors.borderLight,
  },
  avatarInfo: { flex: 1, gap: 2 },
  avatarName: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    color: colors.textPrimary,
  },
  avatarEmail: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[4],
    gap: spacing[3],
  },
  sectionTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.base,
    color: colors.textPrimary,
    marginBottom: spacing[1],
  },
  hint: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    lineHeight: fontSize.xs * 1.5,
  },
});
