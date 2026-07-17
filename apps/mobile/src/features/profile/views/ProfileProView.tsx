import type { AppColors } from '@/theme/colors';
import {
  getProfessionalIdDisplay,
  isProIpaEmploi,
  splitProfessionalId,
  validateProfessionalId,
  PROFESSIONAL_ID_LABEL,
} from '@oneandlab/shared-types';
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
import { Camera, ExternalLink, FileText, Globe, Mail, Share2 } from 'lucide-react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SkeletonProfileScreen } from '@/components/ui/skeletons';
import { ProfileHero } from '@/features/profile/components/ProfileHero';
import { ProEmploiSelect } from '@/features/auth/components/ProEmploiSelect';
import { ProfilePhotosSheetContent } from '@/features/profile/components/ProfilePhotosSheetContent';
import { ProfileSecurityLinkRow } from '@/features/profile/components/ProfileSecurityLinkRow';
import { ProfilePrescriptionSignatureSection } from '@/features/profile/components/ProfilePrescriptionSignatureSection';
import { ProfileSection } from '@/features/profile/components/ProfileSection';
import { ProfileToggleRow } from '@/features/profile/components/ProfileToggleRow';
import { fetchUser, updateProfileImages, updateUser } from '@/features/profile/api/profile.service';
import { generateProPublicSlug } from '@/features/profile/utils/generate-public-slug';
import {
  parseProfileSocialLinks,
  serializeProfileSocialLinks,
} from '@/features/profile/utils/profile-social-links';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/providers/ToastProvider';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { spacing, iconSize, AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

export function ProfileProView() {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'features_profile_views_ProfileProView_tsx_ProfileProView_styles');

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

  useEffect(() => {
    const d = q.data;
    if (!d) return;
    setFirstName(d.first_name ?? '');
    setLastName(d.last_name ?? '');
    setPhone(d.phone ?? '');
    setRpps(getProfessionalIdDisplay(d.rpps, d.adeli));
    setEmploi(d.emploi ?? '');
    setBiography(d.biography ?? '');
    setWebsiteUrl(d.website_url ?? '');
    const social = parseProfileSocialLinks(d.social_links);
    setSocialFacebook(social.facebook);
    setSocialLinkedin(social.linkedin);
    setSocialInstagram(social.instagram);
    setProfileUrl(d.profile_image_url ?? null);
    setCoverUrl(d.cover_image_url ?? null);
  }, [q.data]);

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
      void qc.invalidateQueries({ queryKey: queryKeys.profile.user(user!.id) });
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
          role="pro"
          gender={q.data?.gender}
          profileImageUrl={profileUrl}
          coverImageUrl={coverUrl}
          showCover
          onEditPhotos={() => setPhotosOpen(true)}
        />

        <ProfileSection title="Coordonnées" description="Informations de votre compte Cary" Icon={FileText}>
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

        <ProfileSection
          title="Présentation"
          description="Quelques lignes sur votre activité ou votre cabinet (facultatif)"
          Icon={FileText}
        >
          <Input
            label="Texte de présentation"
            value={biography}
            onChangeText={setBiography}
            multiline
            numberOfLines={5}
            style={{ minHeight: 120, textAlignVertical: 'top' as const }}
            placeholder="Ex. Médecin généraliste, consultations sur rendez-vous…"
          />
        </ProfileSection>

        <ProfileSection
          title="Site web et réseaux"
          description="Liens optionnels (cabinet, LinkedIn, etc.)"
          Icon={Globe}
        >
          <Input
            label="Site internet"
            value={websiteUrl}
            onChangeText={setWebsiteUrl}
            autoCapitalize="none"
            keyboardType="url"
            placeholder="https://…"
            leftIcon={<Globe size={iconSize.sm} color={c.textTertiary} strokeWidth={2} />}
          />
          <Input
            label="Facebook"
            value={socialFacebook}
            onChangeText={setSocialFacebook}
            autoCapitalize="none"
            keyboardType="url"
            placeholder="URL de la page"
            leftIcon={<Share2 size={iconSize.sm} color={c.textTertiary} strokeWidth={2} />}
          />
          <Input
            label="LinkedIn"
            value={socialLinkedin}
            onChangeText={setSocialLinkedin}
            autoCapitalize="none"
            keyboardType="url"
            placeholder="URL du profil"
            leftIcon={<ExternalLink size={iconSize.sm} color={c.textTertiary} strokeWidth={2} />}
          />
          <Input
            label="Instagram"
            value={socialInstagram}
            onChangeText={setSocialInstagram}
            autoCapitalize="none"
            keyboardType="url"
            placeholder="URL du profil"
            leftIcon={<Camera size={iconSize.sm} color={c.textTertiary} strokeWidth={2} />}
          />
        </ProfileSection>

        <ProfileSection
          title="Fiche publique"
          description="Rendez votre profil visible sur Cary pour recevoir des rendez-vous"
          Icon={Globe}
        >
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
              <AppText style={styles.slugText}>cary.fr/professionnel/{publicSlug}</AppText>
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

        <Button title="Enregistrer mon profil" loading={save.isPending} onPress={() => save.mutate()} fullWidth size="lg" />
      </KeyboardScrollView>

      <BottomSheet
        visible={photosOpen}
        onClose={() => setPhotosOpen(false)}
        title="Photos"
        subtitle="Photo affichée sur votre compte"
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
  toggleCard: {
    gap: spacing[1],
  },
  slugText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: c.textTertiary,
    paddingHorizontal: spacing[2],
  },
};
}
