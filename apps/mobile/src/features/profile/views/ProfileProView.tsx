import {
  getProfessionalIdDisplay,
  isProIpaEmploi,
  splitProfessionalId,
  validateProfessionalId,
  PROFESSIONAL_ID_LABEL,
} from '@oneandlab/shared-types';
import { useAppColors } from '@/theme/use-app-colors';
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, ExternalLink, Globe, Share2 } from 'lucide-react-native';
import { SheetModal } from '@/components/ui/SheetModal';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { SkeletonProfileScreen } from '@/components/ui/skeletons';
import { ProfileLoadState } from '@/features/profile/components/ProfileLoadState';
import { useProfileDraft } from '@/features/profile/hooks/useProfileDraft';
import { ProfileEmailField } from '@/features/profile/components/ProfileEmailField';
import { ProfileHero } from '@/features/profile/components/ProfileHero';
import { ProEmploiSelect } from '@/features/auth/components/ProEmploiSelect';
import { ProfilePhotosSheetContent } from '@/features/profile/components/ProfilePhotosSheetContent';
import { ProfileSecurityLinkRow } from '@/features/profile/components/ProfileSecurityLinkRow';
import { ProfilePrescriptionSignatureSection } from '@/features/profile/components/ProfilePrescriptionSignatureSection';
import { ProfileSection } from '@/features/profile/components/ProfileSection';
import { ProfileToggleRow } from '@/features/profile/components/ProfileToggleRow';
import { ProfileSubScreenLayout } from '@/features/profile/screens/ProfileSubScreenLayout';
import { fetchUser, updateProfileImages, updateUser } from '@/features/profile/api/profile.service';
import { generateProPublicSlug } from '@/features/profile/utils/generate-public-slug';
import { proPublicProfilePath } from '@/features/profile/utils/pro-public-profile';
import { webAppUrl } from '@/config/env';
import {
  parseProfileSocialLinks,
  serializeProfileSocialLinks,
} from '@/features/profile/utils/profile-social-links';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/providers/ToastProvider';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { spacing, iconSize, ICON_STROKE_WIDTH, AppText, useStyles } from '@/theme';

export function ProfileProView() {
  const c = useAppColors();
  const styles = useStyles(buildStyles);

  const user = useAuthStore((s) => s.user);
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const { show: toast } = useToast();
  const qc = useQueryClient();
  const [photosOpen, setPhotosOpen] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [rpps, setRpps] = useState('');
  const [emploi, setEmploi] = useState('');
  const [biography, setBiography] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [socialFacebook, setSocialFacebook] = useState('');
  const [socialLinkedin, setSocialLinkedin] = useState('');
  const [socialInstagram, setSocialInstagram] = useState('');
  const [profileUrl, setProfileUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  const q = useQuery({
    queryKey: queryKeys.profile.user(user?.id ?? ''),
    queryFn: async () => (await fetchUser(user!.id)).data,
    enabled: !!user?.id,
  });

  const { dirty } = useProfileDraft(user?.id, q.data,
    { firstName, lastName, phone, rpps, emploi, biography, websiteUrl, socialFacebook, socialLinkedin, socialInstagram, profileUrl, coverUrl },
    d => {
      const social = parseProfileSocialLinks(d.social_links);
      return { firstName: d.first_name ?? '', lastName: d.last_name ?? '', phone: d.phone ?? '', rpps: getProfessionalIdDisplay(d.rpps, d.adeli), emploi: d.emploi ?? '', biography: d.biography ?? '', websiteUrl: d.website_url ?? '', socialFacebook: social.facebook, socialLinkedin: social.linkedin, socialInstagram: social.instagram, profileUrl: d.profile_image_url ?? null, coverUrl: d.cover_image_url ?? null };
    },
    d => { setFirstName(d.firstName); setLastName(d.lastName); setPhone(d.phone); setRpps(d.rpps); setEmploi(d.emploi); setBiography(d.biography); setWebsiteUrl(d.websiteUrl); setSocialFacebook(d.socialFacebook); setSocialLinkedin(d.socialLinkedin); setSocialInstagram(d.socialInstagram); setProfileUrl(d.profileUrl); setCoverUrl(d.coverUrl); },
    ['profileUrl', 'coverUrl'],
  );

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

  const save = useMutation({
    mutationFn: () => {
      const body: Parameters<typeof updateUser>[1] = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim() || null,
        emploi: emploi.trim() || null,
        biography: biography.trim() || null,
        website_url: websiteUrl.trim() || null,
        social_links: serializeProfileSocialLinks({
          facebook: socialFacebook,
          linkedin: socialLinkedin,
          instagram: socialInstagram,
        }),
        profile_image_url: profileUrl,
        cover_image_url: coverUrl,
      };
      if (isProIpaEmploi(emploi)) {
        const profErr = validateProfessionalId(rpps);
        if (profErr) throw new Error(profErr);
        const split = splitProfessionalId(rpps);
        body.professional_id = rpps.replace(/\s/g, '') || null;
        body.rpps = split.rpps;
        body.adeli = split.adeli;
      } else {
        body.rpps = rpps.replace(/\s/g, '') || null;
      }
      return updateUser(user!.id, body);
    },
    onSuccess: async () => {
      await fetchMe();
      await qc.invalidateQueries({ queryKey: queryKeys.profile.user(user!.id) });
      toast('Profil enregistré', { type: 'success' });
    },
    onError: (e) => handleApiError(e, toast, 'updateUser'),
  });

  const saveToggle = useMutation({
    mutationFn: (body: { is_public_profile_enabled: boolean; public_slug?: string }) =>
      updateUser(user!.id, body),
    onSuccess: async () => {
      await fetchMe();
      void qc.invalidateQueries({ queryKey: queryKeys.profile.user(user!.id) });
      toast('Fiche publique mise à jour', { type: 'success' });
    },
    onError: (e) => handleApiError(e, toast, 'updateUser'),
  });

  const publicEnabled = !!q.data?.is_public_profile_enabled;
  const publicSlug = q.data?.public_slug?.trim() ?? '';

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
      }
    >
        <ProfileHero
          name={`${firstName} ${lastName}`}
          seed={user?.id}
          gender={q.data?.gender}
          profileImageUrl={profileUrl}
          coverImageUrl={coverUrl}
          showCover
          onEditPhotos={() => setPhotosOpen(true)}
        />

        <ProfileSection title="Coordonnées">
          <Input label="Prénom" value={firstName} onChangeText={setFirstName} autoCapitalize="words" />
          <Input label="Nom" value={lastName} onChangeText={setLastName} autoCapitalize="words" />
          <ProfileEmailField email={user?.email} />
          <Input label="Téléphone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <ProEmploiSelect value={emploi} onChange={setEmploi} label="Profession (emploi)" />
          <Input
            label={isProIpaEmploi(emploi) ? PROFESSIONAL_ID_LABEL : 'Numéro RPPS'}
            value={rpps}
            onChangeText={setRpps}
            keyboardType="number-pad"
            maxLength={11}
            placeholder={isProIpaEmploi(emploi) ? '123456789 ou 12345678901' : '12345678901'}
            hint={
              isProIpaEmploi(emploi)
                ? '9 chiffres (Adeli) ou 11 chiffres (RPPS)'
                : undefined
            }
          />
        </ProfileSection>

        <ProfileSection title="Présentation">
          <Textarea
            label="Texte de présentation"
            value={biography}
            onChangeText={setBiography}
            placeholder="Ex. Médecin généraliste, consultations sur rendez-vous…"
            hint="Facultatif."
          />
        </ProfileSection>

        <ProfileSection title="Site web et réseaux">
          <Input
            label="Site internet"
            value={websiteUrl}
            onChangeText={setWebsiteUrl}
            autoCapitalize="none"
            keyboardType="url"
            placeholder="https://…"
            leftIcon={<Globe size={iconSize.md} color={c.textTertiary} strokeWidth={ICON_STROKE_WIDTH} />}
          />
          <Input
            label="Facebook"
            value={socialFacebook}
            onChangeText={setSocialFacebook}
            autoCapitalize="none"
            keyboardType="url"
            placeholder="URL de la page"
            leftIcon={<Share2 size={iconSize.md} color={c.textTertiary} strokeWidth={ICON_STROKE_WIDTH} />}
          />
          <Input
            label="LinkedIn"
            value={socialLinkedin}
            onChangeText={setSocialLinkedin}
            autoCapitalize="none"
            keyboardType="url"
            placeholder="URL du profil"
            leftIcon={<ExternalLink size={iconSize.md} color={c.textTertiary} strokeWidth={ICON_STROKE_WIDTH} />}
          />
          <Input
            label="Instagram"
            value={socialInstagram}
            onChangeText={setSocialInstagram}
            autoCapitalize="none"
            keyboardType="url"
            placeholder="URL du profil"
            leftIcon={<Camera size={iconSize.md} color={c.textTertiary} strokeWidth={ICON_STROKE_WIDTH} />}
          />
        </ProfileSection>

        <ProfileSection title="Fiche publique">
          <View style={styles.toggleCard}>
            <ProfileToggleRow
              label="Profil public"
              hint={publicEnabled ? 'Visible sur Cary' : 'Non visible sur Cary'}
              value={publicEnabled}
              busy={saveToggle.isPending}
              onValueChange={(v) => {
                const payload: { is_public_profile_enabled: boolean; public_slug?: string } = {
                  is_public_profile_enabled: v,
                };
                if (v && !publicSlug) {
                  payload.public_slug = generateProPublicSlug(
                    firstName || q.data?.first_name || user?.first_name,
                    lastName || q.data?.last_name || user?.last_name,
                  );
                }
                saveToggle.mutate(payload);
              }}
            />
            {publicEnabled && publicSlug ? (
              <AppText variant="caption" selectable>
                {webAppUrl(proPublicProfilePath(publicSlug)).replace(/^https?:\/\//, '')}
              </AppText>
            ) : null}
          </View>
        </ProfileSection>

        {user?.id ? (
          <ProfilePrescriptionSignatureSection
            userId={user.id}
            signaturePng={q.data?.prescription_signature_png}
          />
        ) : null}

        <ProfileSecurityLinkRow />
    </ProfileSubScreenLayout>
  );
}

function buildStyles() {
  return {
    sheetBody: {
      paddingTop: spacing[2],
    },
    toggleCard: {
      gap: spacing[2],
    },
  };
}
