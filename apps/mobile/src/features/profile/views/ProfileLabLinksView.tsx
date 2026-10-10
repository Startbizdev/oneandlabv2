import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/Input';
import { ProfileLoadState } from '@/features/profile/components/ProfileLoadState';
import { ProfileSection } from '@/features/profile/components/ProfileSection';
import { ProfileSubScreenLayout } from '@/features/profile/screens/ProfileSubScreenLayout';
import { useProfileDraft } from '@/features/profile/hooks/useProfileDraft';
import { fetchUser, updateUser } from '@/features/profile/api/profile.service';
import { parseProfileSocialLinks, serializeProfileSocialLinks } from '@/features/profile/utils/profile-social-links';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/providers/ToastProvider';
import { handleApiError } from '@/lib/errors/handle-api-error';

/** Site et réseaux d'un laboratoire ou sous-compte. */
export function ProfileLabLinksView() {
  const user = useAuthStore((s) => s.user);
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const { show: toast } = useToast();
  const qc = useQueryClient();
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [socialFacebook, setSocialFacebook] = useState('');
  const [socialLinkedin, setSocialLinkedin] = useState('');
  const [socialInstagram, setSocialInstagram] = useState('');

  const q = useQuery({
    queryKey: queryKeys.profile.fullUser(user?.id ?? ''),
    queryFn: async () => (await fetchUser(user!.id, 'full')).data,
    enabled: !!user?.id,
  });

  const { dirty } = useProfileDraft(
    user?.id,
    q.data,
    { websiteUrl, socialFacebook, socialLinkedin, socialInstagram },
    (d) => {
      const social = parseProfileSocialLinks(d.social_links);
      return {
        websiteUrl: d.website_url ?? '',
        socialFacebook: social.facebook,
        socialLinkedin: social.linkedin,
        socialInstagram: social.instagram,
      };
    },
    (d) => {
      setWebsiteUrl(d.websiteUrl);
      setSocialFacebook(d.socialFacebook);
      setSocialLinkedin(d.socialLinkedin);
      setSocialInstagram(d.socialInstagram);
    },
  );

  const save = useMutation({
    mutationFn: () =>
      updateUser(user!.id, {
        website_url: websiteUrl.trim() || null,
        social_links: serializeProfileSocialLinks({
          facebook: socialFacebook,
          linkedin: socialLinkedin,
          instagram: socialInstagram,
        }),
      }),
    onSuccess: async () => {
      await fetchMe();
      await qc.invalidateQueries({ queryKey: queryKeys.profile.user(user!.id) });
      toast('Liens enregistrés', { type: 'success' });
    },
    onError: (e) => handleApiError(e, toast, 'updateUser'),
  });

  if (q.isLoading || q.isError || !q.data) {
    return <ProfileLoadState loading={q.isLoading || !user?.id} refreshing={q.isFetching} error={q.error} onRetry={() => void q.refetch()} />;
  }

  return (
    <ProfileSubScreenLayout saving={save.isPending} onSave={() => save.mutate()} saveTitle="Enregistrer" dirty={dirty}>
      <ProfileSection title="Site et réseaux">
        <Input label="Site internet" value={websiteUrl} onChangeText={setWebsiteUrl} autoCapitalize="none" keyboardType="url" placeholder="https://" />
        <Input label="Facebook" value={socialFacebook} onChangeText={setSocialFacebook} autoCapitalize="none" keyboardType="url" placeholder="https://" />
        <Input label="LinkedIn" value={socialLinkedin} onChangeText={setSocialLinkedin} autoCapitalize="none" keyboardType="url" placeholder="https://" />
        <Input label="Instagram" value={socialInstagram} onChangeText={setSocialInstagram} autoCapitalize="none" keyboardType="url" placeholder="https://" />
      </ProfileSection>
    </ProfileSubScreenLayout>
  );
}
