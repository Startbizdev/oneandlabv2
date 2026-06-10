import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ExternalLink,
  FileText,
  Globe,
  GraduationCap,
  HeartPulse,
  Lock,
  MapPin,
} from 'lucide-react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { ProfileHero } from '@/features/profile/components/ProfileHero';
import { ProfilePhotosSheetContent } from '@/features/profile/components/ProfilePhotosSheetContent';
import { ProfileNavCard } from '@/features/profile/components/ProfileNavCard';
import { ProfileNavRow } from '@/features/profile/components/ProfileNavRow';
import { useNurseProfileSummary } from '@/features/profile/hooks/use-nurse-profile-summary';
import { fetchUser, updateProfileImages } from '@/features/profile/api/profile.service';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/providers/ToastProvider';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { nursePublicProfilePath } from '@/features/profile/utils/nurse-public-profile';
import { colors, spacing } from '@/theme';
import { useAppColors } from '@/theme/use-app-colors';

export function ProfileNurseHubView() {
  const router = useRouter();
  const c = useAppColors();
  const user = useAuthStore((s) => s.user);
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const { show: toast } = useToast();
  const qc = useQueryClient();
  const summary = useNurseProfileSummary();

  const [photosOpen, setPhotosOpen] = useState(false);
  const [profileUrl, setProfileUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  const profileQ = useQuery({
    queryKey: queryKeys.profile.user(user?.id ?? ''),
    queryFn: async () => (await fetchUser(user!.id, 'full')).data,
    enabled: !!user?.id,
  });

  useEffect(() => {
    const d = profileQ.data;
    if (!d) return;
    setProfileUrl(d.profile_image_url ?? null);
    setCoverUrl(d.cover_image_url ?? null);
  }, [profileQ.data]);

  useFocusEffect(
    useCallback(() => {
      if (!user?.id) return;
      void qc.invalidateQueries({ queryKey: queryKeys.profile.user(user.id) });
      void qc.invalidateQueries({ queryKey: queryKeys.profile.nursePreferences });
      void qc.invalidateQueries({
        queryKey: queryKeys.profile.coverageZones(user.id, 'nurse'),
      });
    }, [qc, user?.id]),
  );

  const push = (path: string) => router.push(path as never);

  const savePhotos = useMutation({
    mutationFn: (body: { profile_image_url: string | null; cover_image_url: string | null }) =>
      updateProfileImages(user!.id, body),
    onSuccess: async () => {
      await fetchMe();
      void qc.invalidateQueries({ queryKey: queryKeys.profile.user(user!.id) });
      toast('Photos enregistrées', { type: 'success' });
    },
    onError: (e) => handleApiError(e, toast, 'profile-images'),
  });

  const onChangeProfilePhoto = useCallback(
    (url: string | null) => {
      setProfileUrl(url);
      savePhotos.mutate({ profile_image_url: url, cover_image_url: coverUrl });
    },
    [coverUrl, savePhotos],
  );

  const onChangeCoverPhoto = useCallback(
    (url: string | null) => {
      setCoverUrl(url);
      savePhotos.mutate({ profile_image_url: profileUrl, cover_image_url: url });
    },
    [profileUrl, savePhotos],
  );

  const publicSlug = profileQ.data?.public_slug?.trim() ?? '';

  const openPublicProfile = useCallback(() => {
    const path = nursePublicProfilePath(publicSlug);
    push(
      `/(nurse)/web?path=${encodeURIComponent(path)}&title=${encodeURIComponent('Mon profil public')}` as never,
    );
  }, [publicSlug, push]);

  return (
    <>
      <ScrollView
        contentContainerStyle={styles.scroll}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        <ProfileHero
          firstName={user?.first_name ?? ''}
          lastName={user?.last_name ?? ''}
          email={user?.email}
          role="nurse"
          gender={profileQ.data?.gender}
          profileImageUrl={profileUrl ?? user?.profile_image_url}
          coverImageUrl={coverUrl}
          showCover
          onEditPhotos={() => setPhotosOpen(true)}
        />

        <ProfileNavCard title="Mon profil">
          <ProfileNavRow
            icon={FileText}
            title="Coordonnées"
            subtitle={summary.coordinatesSubtitle}
            onPress={() => push('/profile/nurse/coordinates')}
          />
          <View style={styles.divider} />
          <ProfileNavRow
            icon={Globe}
            title="Présentation"
            subtitle={summary.presentationSubtitle}
            onPress={() => push('/profile/nurse/presentation')}
            iconColor={c.success}
            iconBg={c.successLight}
          />
          <View style={styles.divider} />
          <ProfileNavRow
            icon={GraduationCap}
            title="Diplômes et formations"
            subtitle={summary.qualificationsSubtitle}
            onPress={() => push('/profile/nurse/qualifications')}
            iconColor={c.warning}
            iconBg={c.warningLight}
          />
          <View style={styles.divider} />
          <ProfileNavRow
            icon={HeartPulse}
            title="Types de soins"
            subtitle={summary.careTypesSubtitle}
            onPress={() => push('/profile/nurse/care-types')}
            iconColor={colors.error}
            iconBg={colors.errorLight}
          />
          <View style={styles.divider} />
          <ProfileNavRow
            icon={MapPin}
            title="Zone de couverture"
            subtitle={summary.coverageSubtitle}
            onPress={() => push('/profile/nurse/coverage')}
            iconColor={colors.primary}
            iconBg={colors.primaryLight}
          />
          {publicSlug ? (
            <>
              <View style={styles.divider} />
              <ProfileNavRow
                icon={ExternalLink}
                title="Voir mon profil public"
                subtitle={nursePublicProfilePath(publicSlug)}
                onPress={openPublicProfile}
                iconColor={c.primaryDark}
                iconBg={c.primaryLight}
              />
            </>
          ) : null}
        </ProfileNavCard>

        <ProfileNavCard title="Compte">
          <ProfileNavRow
            icon={Lock}
            title="Mot de passe et connexion"
            subtitle="Créer ou modifier votre mot de passe · biométrie"
            onPress={() => push('/profile/security')}
            iconColor={c.primary}
            iconBg={c.primaryLight}
          />
        </ProfileNavCard>
      </ScrollView>

      <BottomSheet
        visible={photosOpen}
        onClose={() => setPhotosOpen(false)}
        title="Photos"
        subtitle="Personnalisez votre fiche publique"
        contentStyle={styles.sheetBody}
      >
        <ProfilePhotosSheetContent
          profileImageUrl={profileUrl}
          coverImageUrl={coverUrl}
          showCover
          saving={savePhotos.isPending}
          onChangeProfile={onChangeProfilePhoto}
          onChangeCover={onChangeCoverPhoto}
        />
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: spacing[4],
    gap: spacing[4],
    paddingBottom: spacing[12],
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginLeft: spacing[4] + 40 + spacing[3],
  },
  sheetBody: {
    paddingTop: spacing[2],
    paddingBottom: spacing[6],
  },
});
