import { colors } from '@/theme';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { KeyboardScrollView } from '@/components/layout/KeyboardScrollView';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Mail } from 'lucide-react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SkeletonProfileScreen } from '@/components/ui/skeletons';
import { ProfileHero } from '@/features/profile/components/ProfileHero';
import { ProfilePhotosSheetContent } from '@/features/profile/components/ProfilePhotosSheetContent';
import { ProfileSecurityLinkRow } from '@/features/profile/components/ProfileSecurityLinkRow';
import { ProfileSection } from '@/features/profile/components/ProfileSection';
import { fetchUser, updateProfileImages, updateUser } from '@/features/profile/api/profile.service';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/providers/ToastProvider';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

export function ProfilePreleveurView() {
  const user = useAuthStore((s) => s.user);
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const { show: toast } = useToast();
  const qc = useQueryClient();
  const [photosOpen, setPhotosOpen] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [profileUrl, setProfileUrl] = useState<string | null>(null);

  const q = useQuery({
    queryKey: queryKeys.profile.user(user?.id ?? ''),
    queryFn: async () => (await fetchUser(user!.id)).data,
    enabled: !!user?.id,
  });

  useEffect(() => {
    const d = q.data;
    if (!d) return;
    setFirstName(d.first_name ?? '');
    setLastName(d.last_name ?? '');
    setPhone(d.phone ?? '');
    setProfileUrl(d.profile_image_url ?? null);
  }, [q.data]);

  const savePhotos = useMutation({
    mutationFn: (url: string | null) => updateProfileImages(user!.id, { profile_image_url: url }),
    onSuccess: async () => {
      await fetchMe();
      void qc.invalidateQueries({ queryKey: queryKeys.profile.user(user!.id) });
      toast('Photo enregistrée', { type: 'success' });
    },
    onError: (e) => handleApiError(e, toast, 'profile-images'),
  });

  const onChangeProfilePhoto = useCallback(
    (url: string | null) => {
      setProfileUrl(url);
      savePhotos.mutate(url);
    },
    [savePhotos],
  );

  const save = useMutation({
    mutationFn: () =>
      updateUser(user!.id, {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim() || null,
        profile_image_url: profileUrl,
      }),
    onSuccess: async () => {
      await fetchMe();
      void qc.invalidateQueries({ queryKey: queryKeys.profile.user(user!.id) });
      toast('Profil enregistré', { type: 'success' });
    },
    onError: (e) => handleApiError(e, toast, 'updateUser'),
  });

  if (q.isLoading) {
    return <SkeletonProfileScreen cards={2} />;
  }

  return (
    <>
      <KeyboardScrollView contentContainerStyle={styles.scroll}>
        <ProfileHero
          firstName={firstName}
          lastName={lastName}
          email={user?.email}
          role="preleveur"
          gender={q.data?.gender}
          profileImageUrl={profileUrl}
          onEditPhotos={() => setPhotosOpen(true)}
        />

        <ProfileSection title="Informations" description="Compte préleveur Cary" Icon={FileText}>
          <Input label="Prénom" value={firstName} onChangeText={setFirstName} autoCapitalize="words" />
          <Input label="Nom" value={lastName} onChangeText={setLastName} autoCapitalize="words" />
          <View>
            <Text style={styles.fieldLabel}>Email</Text>
            <View style={styles.emailRow}>
              <Mail size={16} color={colors.textTertiary} strokeWidth={2} />
              <Text style={styles.emailText}>{user?.email ?? '—'}</Text>
            </View>
            <Text style={styles.fieldHint}>L'email ne peut pas être modifié depuis l'application.</Text>
          </View>
          <Input label="Téléphone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        </ProfileSection>

        <ProfileSecurityLinkRow />

        <Button
          title="Enregistrer mon profil"
          loading={save.isPending}
          onPress={() => save.mutate()}
          fullWidth
          size="lg"
        />
      </KeyboardScrollView>

      <BottomSheet
        visible={photosOpen}
        onClose={() => setPhotosOpen(false)}
        title="Photo"
        subtitle="Votre photo de profil"
        contentStyle={styles.sheetBody}
      >
        <ProfilePhotosSheetContent
          profileImageUrl={profileUrl}
          showCover={false}
          saving={savePhotos.isPending}
          onChangeProfile={onChangeProfilePhoto}
        />
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing[4], gap: spacing[4], paddingBottom: spacing[12] },
  sheetBody: {
    paddingTop: spacing[2],
    paddingBottom: spacing[6],
  },
  fieldLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  fieldHint: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    marginTop: spacing[1],
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surfaceAlt,
  },
  emailText: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
});
