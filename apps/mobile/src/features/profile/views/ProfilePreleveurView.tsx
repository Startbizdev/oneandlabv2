import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { Cluster } from '@/components/layout/primitives';
import { KeyboardScrollView } from '@/components/layout/KeyboardScrollView';
import {
  buildTabSceneScrollConfig,
  spreadTabSceneScrollProps,
  useTabSceneInsets,
} from '@/components/navigation/liquid-glass-header-inset';
import { StackChromeScreen } from '@/navigation/StackChromeScreen';
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
import { spacing, iconSize, AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

export function ProfilePreleveurView() {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'features_profile_views_ProfilePreleveurView_tsx_ProfilePreleveurView_styles');

  const user = useAuthStore((s) => s.user);
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const { show: toast } = useToast();
  const qc = useQueryClient();
  const sceneInsets = useTabSceneInsets();
  const scrollConfig = buildTabSceneScrollConfig(sceneInsets, styles.scroll);
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
    <StackChromeScreen>
      <KeyboardScrollView
        {...spreadTabSceneScrollProps(scrollConfig)}
        contentContainerStyle={scrollConfig.contentContainerStyle}
      >
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
            <AppText style={styles.fieldLabel}>Email</AppText>
            <Cluster
              gap={spacing[2]}
              leading={<Mail size={iconSize.sm} color={c.textTertiary} strokeWidth={2} />}
              style={styles.emailRow}
            >
              <AppText style={styles.emailText}>{user?.email ?? '—'}</AppText>
            </Cluster>
            <AppText style={styles.fieldHint}>L'email ne peut pas être modifié depuis l'application.</AppText>
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
    </StackChromeScreen>
  );
}

function buildStyles(c: AppColors) {
  return {
  scroll: { padding: spacing[4], gap: spacing[4], paddingBottom: spacing[12] },
  sheetBody: {
    paddingTop: spacing[2],
    paddingBottom: spacing[6],
  },
  fieldLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: c.textPrimary,
  },
  fieldHint: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: c.textTertiary,
    marginTop: spacing[1],
  },
  emailRow: {
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.borderLight,
    backgroundColor: c.surfaceAlt,
  },
  emailText: {
    minWidth: 0,
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: c.textSecondary,
  },
};
}
