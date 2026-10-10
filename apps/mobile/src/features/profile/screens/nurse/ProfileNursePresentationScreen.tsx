import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/Input';
import { SelectField, type SelectOption } from '@/components/ui/SelectField';
import { Textarea } from '@/components/ui/Textarea';
import { ProfileSection } from '@/features/profile/components/ProfileSection';
import { ProfileToggleRow } from '@/features/profile/components/ProfileToggleRow';
import { ProfileSubScreenLayout } from '@/features/profile/screens/ProfileSubScreenLayout';
import { ProfileLoadState } from '@/features/profile/components/ProfileLoadState';
import { useProfileDraft } from '@/features/profile/hooks/useProfileDraft';
import { fetchUser, updateUser } from '@/features/profile/api/profile.service';
import { generateNursePublicSlug } from '@/features/profile/utils/generate-public-slug';
import { parseProfileSocialLinks, serializeProfileSocialLinks } from '@/features/profile/utils/profile-social-links';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/providers/ToastProvider';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { useStyles, type Theme } from '@/theme';

const YEARS_OPTIONS: SelectOption[] = [
  { value: '1', label: '1 an' },
  { value: '3', label: '3 ans' },
  { value: '5', label: '5 ans' },
  { value: '10', label: '10 ans' },
  { value: '10_plus', label: 'Plus de 10 ans' },
];

export function ProfileNursePresentationScreen() {
  const styles = useStyles(buildStyles);
  const user = useAuthStore((s) => s.user);
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const { show: toast } = useToast();
  const qc = useQueryClient();

  const [biography, setBiography] = useState('');
  const [yearsExperience, setYearsExperience] = useState('');
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
    { biography, yearsExperience, websiteUrl, socialFacebook, socialLinkedin, socialInstagram },
    (d) => {
      const social = parseProfileSocialLinks(d.social_links);
      return {
        biography: d.biography ?? '',
        yearsExperience: d.years_experience ?? '',
        websiteUrl: d.website_url ?? '',
        socialFacebook: social.facebook,
        socialLinkedin: social.linkedin,
        socialInstagram: social.instagram,
      };
    },
    (d) => {
      setBiography(d.biography);
      setYearsExperience(d.yearsExperience);
      setWebsiteUrl(d.websiteUrl);
      setSocialFacebook(d.socialFacebook);
      setSocialLinkedin(d.socialLinkedin);
      setSocialInstagram(d.socialInstagram);
    },
  );

  const savePresentation = useMutation({
    mutationFn: () =>
      updateUser(user!.id, {
        biography: biography.trim() || null,
        years_experience: yearsExperience || null,
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
      toast('Présentation enregistrée', { type: 'success' });
    },
    onError: (e) => handleApiError(e, toast, 'updateUser'),
  });

  const saveToggle = useMutation({
    mutationFn: (body: {
      is_public_profile_enabled?: boolean;
      is_accepting_appointments?: boolean;
      public_slug?: string;
    }) => updateUser(user!.id, body),
    onSuccess: async () => {
      await fetchMe();
      void qc.invalidateQueries({ queryKey: queryKeys.profile.user(user!.id) });
      toast('Présentation mise à jour', { type: 'success' });
    },
    onError: (e) => handleApiError(e, toast, 'updateUser'),
  });

  const publicEnabled = !!q.data?.is_public_profile_enabled;
  const accepting =
    q.data?.is_accepting_appointments !== false && q.data?.is_accepting_appointments !== 0;
  const busyToggle = saveToggle.isPending ? saveToggle.variables : null;

  if (q.isLoading || q.isError || !q.data) return <ProfileLoadState loading={q.isLoading || !user?.id} refreshing={q.isFetching} error={q.error} onRetry={() => void q.refetch()} />;

  return (
    <ProfileSubScreenLayout
      saving={savePresentation.isPending}
      onSave={() => savePresentation.mutate()}
      saveTitle="Enregistrer"
      dirty={dirty}
    >
      <Textarea
        label="Biographie"
        value={biography}
        onChangeText={setBiography}
        placeholder="Présentez votre parcours et votre zone d'intervention…"
      />
      <SelectField
        label="Années d’expérience"
        value={yearsExperience}
        options={YEARS_OPTIONS}
        onChange={setYearsExperience}
      />
      <ProfileSection title="Site et réseaux">
        <Input label="Site internet" value={websiteUrl} onChangeText={setWebsiteUrl} autoCapitalize="none" keyboardType="url" placeholder="https://" />
        <Input label="Facebook" value={socialFacebook} onChangeText={setSocialFacebook} autoCapitalize="none" keyboardType="url" placeholder="https://" />
        <Input label="LinkedIn" value={socialLinkedin} onChangeText={setSocialLinkedin} autoCapitalize="none" keyboardType="url" placeholder="https://" />
        <Input label="Instagram" value={socialInstagram} onChangeText={setSocialInstagram} autoCapitalize="none" keyboardType="url" placeholder="https://" />
      </ProfileSection>

      <ProfileSection title="Visibilité">
        <ProfileToggleRow
          label="Fiche publique"
          hint={publicEnabled ? 'Visible sur Cary' : 'Non visible sur Cary'}
          value={publicEnabled}
          busy={busyToggle?.is_public_profile_enabled !== undefined}
          onValueChange={(v) => {
            const payload: {
              is_public_profile_enabled: boolean;
              public_slug?: string;
            } = { is_public_profile_enabled: v };
            if (v && !q.data?.public_slug?.trim()) {
              payload.public_slug = generateNursePublicSlug(
                q.data?.first_name ?? user?.first_name,
                q.data?.last_name ?? user?.last_name,
              );
            }
            saveToggle.mutate(payload);
          }}
        />
        <View style={styles.divider} />
        <ProfileToggleRow
          label="Accepter de nouveaux RDV"
          hint={accepting ? 'Vous recevez des demandes' : 'Pause activée'}
          value={accepting}
          busy={busyToggle?.is_accepting_appointments !== undefined}
          onValueChange={(v) => saveToggle.mutate({ is_accepting_appointments: v })}
        />
      </ProfileSection>
    </ProfileSubScreenLayout>
  );
}

function buildStyles({ colors: c }: Theme) {
  return {
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.borderLight,
    },
  };
}
