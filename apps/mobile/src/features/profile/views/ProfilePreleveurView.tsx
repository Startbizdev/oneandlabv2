import { useCallback, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SheetModal } from '@/components/ui/SheetModal';
import { Input } from '@/components/ui/Input';
import { SkeletonProfileScreen } from '@/components/ui/skeletons';
import { ProfileLoadState } from '@/features/profile/components/ProfileLoadState';
import { useProfileDraft } from '@/features/profile/hooks/useProfileDraft';
import { ProfileEmailField } from '@/features/profile/components/ProfileEmailField';
import { ProfileHero } from '@/features/profile/components/ProfileHero';
import { ProfilePhotosSheetContent } from '@/features/profile/components/ProfilePhotosSheetContent';
import { ProfileSecurityLinkRow } from '@/features/profile/components/ProfileSecurityLinkRow';
import { ProfileSection } from '@/features/profile/components/ProfileSection';
import { ProfileSubScreenLayout } from '@/features/profile/screens/ProfileSubScreenLayout';
import { fetchUser, updateProfileImages, updateUser } from '@/features/profile/api/profile.service';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/providers/ToastProvider';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { spacing, useStyles } from '@/theme';

export function ProfilePreleveurView() {
  const styles = useStyles(buildStyles);

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

  const { dirty } = useProfileDraft(user?.id, q.data, { firstName, lastName, phone, profileUrl },
    d => ({ firstName: d.first_name ?? '', lastName: d.last_name ?? '', phone: d.phone ?? '', profileUrl: d.profile_image_url ?? null }),
    d => { setFirstName(d.firstName); setLastName(d.lastName); setPhone(d.phone); setProfileUrl(d.profileUrl); },
    ['profileUrl'],
  );

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
      await qc.invalidateQueries({ queryKey: queryKeys.profile.user(user!.id) });
      toast('Profil enregistré', { type: 'success' });
    },
    onError: (e) => handleApiError(e, toast, 'updateUser'),
  });

  if (q.isLoading || !user?.id) {
    return <SkeletonProfileScreen cards={2} />;
  }
  if (q.isError || !q.data) return <ProfileLoadState refreshing={q.isFetching} error={q.error} onRetry={() => void q.refetch()} />;

  return (
    <ProfileSubScreenLayout
      saveTitle="Enregistrer mon profil"
      onSave={() => save.mutate()}
      saving={save.isPending}
      dirty={dirty}
      overlay={
        <SheetModal
          visible={photosOpen}
          onClose={() => setPhotosOpen(false)}
          title="Photo de profil"
          contentStyle={styles.sheetBody}
        >
          <ProfilePhotosSheetContent
            profileImageUrl={profileUrl}
            showCover={false}
            saving={savePhotos.isPending}
            onChangeProfile={onChangeProfilePhoto}
          />
        </SheetModal>
      }
    >
      <ProfileHero
        name={`${firstName} ${lastName}`}
        seed={user?.id}
        gender={q.data?.gender}
        profileImageUrl={profileUrl}
        onEditPhotos={() => setPhotosOpen(true)}
      />

      <ProfileSection title="Informations personnelles">
        <Input label="Prénom" value={firstName} onChangeText={setFirstName} autoCapitalize="words" />
        <Input label="Nom" value={lastName} onChangeText={setLastName} autoCapitalize="words" />
        <ProfileEmailField email={user?.email} />
        <Input label="Téléphone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      </ProfileSection>

      <ProfileSecurityLinkRow />
    </ProfileSubScreenLayout>
  );
}

function buildStyles() {
  return {
    sheetBody: {
      paddingTop: spacing[2],
      paddingBottom: spacing[6],
    },
  };
}
