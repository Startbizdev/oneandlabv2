import { useCallback, useEffect, useState } from 'react';
import { ScrollView } from 'react-native';
import { StackChromeScreen } from '@/navigation/StackChromeScreen';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { webPageHref } from '@/features/legal/utils/web-page-href';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ExternalLink,
  FileText,
  Globe,
  GraduationCap,
  HeartPulse,
  MapPin,
} from 'lucide-react-native';
import { SheetModal } from '@/components/ui/SheetModal';
import { ProfileHero } from '@/features/profile/components/ProfileHero';
import { ProfilePhotosSheetContent } from '@/features/profile/components/ProfilePhotosSheetContent';
import { SettingsSection } from '@/components/ui/SettingsSection';
import { ProfileSecurityLinkRow } from '@/features/profile/components/ProfileSecurityLinkRow';
import { ProfilePrescriptionSignatureSection } from '@/features/profile/components/ProfilePrescriptionSignatureSection';
import { useNurseProfileSummary } from '@/features/profile/hooks/use-nurse-profile-summary';
import { fetchUser, updateProfileImages } from '@/features/profile/api/profile.service';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/providers/ToastProvider';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { spacing, useStyles } from '@/theme';
import { ProfileLoadState } from '@/features/profile/components/ProfileLoadState';

export function ProfileNurseHubView() {
  const styles = useStyles(buildStyles);

  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const { show: toast } = useToast();
  const qc = useQueryClient();
  const summary = useNurseProfileSummary();

  const [photosOpen, setPhotosOpen] = useState(false);
  const [profileUrl, setProfileUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  const profileQ = useQuery({
    queryKey: queryKeys.profile.fullUser(user?.id ?? ''),
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

  const push = useCallback((href: Href) => router.push(href), [router]);

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
    push(webPageHref('/(nurse)', { kind: 'nurse-profile', slug: publicSlug }));
  }, [publicSlug, push]);

  if (profileQ.isLoading || profileQ.isError || !profileQ.data) return <ProfileLoadState loading={profileQ.isLoading || !user?.id} refreshing={profileQ.isFetching} error={profileQ.error} onRetry={() => void profileQ.refetch()} />;

  return (
    <StackChromeScreen>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <ProfileHero
          name={`${user?.first_name ?? ''} ${user?.last_name ?? ''}`}
          seed={user?.id}
          subtitle={user?.email}
          gender={profileQ.data?.gender}
          profileImageUrl={profileUrl ?? user?.profile_image_url}
          coverImageUrl={coverUrl}
          showCover
          onEditPhotos={() => setPhotosOpen(true)}
        />

        <SettingsSection
          title="Mon profil"
          items={[
            {
              icon: FileText,
              label: 'Coordonnées',
              description: summary.coordinatesSubtitle,
              onPress: () => push('/profile/nurse/coordinates'),
            },
            {
              icon: Globe,
              label: 'Présentation',
              description: summary.presentationSubtitle,
              onPress: () => push('/profile/nurse/presentation'),
            },
            {
              icon: GraduationCap,
              label: 'Diplômes et formations',
              description: summary.qualificationsSubtitle,
              onPress: () => push('/profile/nurse/qualifications'),
            },
            {
              icon: HeartPulse,
              label: 'Types de soins',
              description: summary.careTypesSubtitle,
              onPress: () => push('/profile/nurse/care-types'),
            },
            {
              icon: MapPin,
              label: 'Zone de couverture',
              description: summary.coverageSubtitle,
              onPress: () => push('/profile/nurse/coverage'),
            },
            ...(publicSlug
              ? [{ icon: ExternalLink, label: 'Voir mon profil public', onPress: openPublicProfile }]
              : []),
          ]}
        />

        {user?.id ? (
          <ProfilePrescriptionSignatureSection
            userId={user.id}
            signaturePng={profileQ.data?.prescription_signature_png}
          />
        ) : null}

        <ProfileSecurityLinkRow />
      </ScrollView>

      <SheetModal
        visible={photosOpen}
        onClose={() => setPhotosOpen(false)}
        title="Photos"
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
      </SheetModal>
    </StackChromeScreen>
  );
}

function buildStyles() {
  return {
    scroll: {
      padding: spacing[4],
      gap: spacing[6],
      paddingBottom: spacing[12],
    },
    sheetBody: {
      paddingTop: spacing[2],
      paddingBottom: spacing[6],
    },
  };
}
