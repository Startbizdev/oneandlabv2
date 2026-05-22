import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Globe, Mail } from 'lucide-react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { PRO_SANTE_EMPLOIS } from '@/constants/pro-emploi';
import { ProfileHero } from '@/features/profile/components/ProfileHero';
import { ProfilePhotosSheetContent } from '@/features/profile/components/ProfilePhotosSheetContent';
import { ProfileSection } from '@/features/profile/components/ProfileSection';
import { fetchUser, updateProfileImages, updateUser } from '@/features/profile/api/profile.service';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/providers/ToastProvider';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { colors, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

export function ProfileProView() {
  const user = useAuthStore((s) => s.user);
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const { show: toast } = useToast();
  const qc = useQueryClient();
  const [photosOpen, setPhotosOpen] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [adeli, setAdeli] = useState('');
  const [emploi, setEmploi] = useState('');
  const [biography, setBiography] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [publicEnabled, setPublicEnabled] = useState(false);
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
    setAdeli(d.adeli ?? '');
    setEmploi(d.emploi ?? '');
    setBiography(d.biography ?? '');
    setWebsiteUrl(d.website_url ?? '');
    setPublicEnabled(!!d.is_public_profile_enabled);
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
    mutationFn: () =>
      updateUser(user!.id, {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim() || null,
        adeli: adeli.replace(/\s/g, '') || null,
        emploi: emploi.trim() || null,
        biography: biography.trim() || null,
        website_url: websiteUrl.trim() || null,
        is_public_profile_enabled: publicEnabled,
        profile_image_url: profileUrl,
        cover_image_url: coverUrl,
      }),
    onSuccess: async () => {
      await fetchMe();
      void qc.invalidateQueries({ queryKey: queryKeys.profile.user(user!.id) });
      toast('Profil enregistré', { type: 'success' });
    },
    onError: (e) => handleApiError(e, toast, 'updateUser'),
  });

  if (q.isLoading) {
    return (
      <View style={{ padding: spacing[4], gap: spacing[3] }}>
        <Skeleton height={160} borderRadius={16} />
        <Skeleton height={200} borderRadius={16} />
      </View>
    );
  }

  return (
    <>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
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
            <Text style={styles.fieldLabel}>Email</Text>
            <View style={styles.emailRow}>
              <Mail size={16} color={colors.textTertiary} strokeWidth={2} />
              <Text style={styles.emailText}>{user?.email ?? '—'}</Text>
            </View>
            <Text style={styles.fieldHint}>L'email ne peut pas être modifié depuis l'application.</Text>
          </View>
          <Input label="Téléphone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <Input label="Profession" value={emploi} onChangeText={setEmploi} placeholder="Médecin généraliste…" />
          <View style={styles.emploiHints}>
            {PRO_SANTE_EMPLOIS.slice(0, 6).map((e) => (
              <Pressable key={e} onPress={() => setEmploi(e)}>
                <Text style={styles.hintChip}>{e}</Text>
              </Pressable>
            ))}
          </View>
          <Input
            label="Numéro Adeli"
            value={adeli}
            onChangeText={setAdeli}
            keyboardType="number-pad"
            maxLength={9}
          />
        </ProfileSection>

        <ProfileSection title="Présentation" description="Votre fiche publique sur Cary" Icon={Globe}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Fiche publique</Text>
              <Text style={styles.toggleHint}>
                {publicEnabled ? 'Visible sur Cary' : 'Non visible'}
              </Text>
            </View>
            <Switch
              value={publicEnabled}
              onValueChange={setPublicEnabled}
              trackColor={{ false: colors.border, true: colors.primaryMid }}
              thumbColor={publicEnabled ? colors.primary : colors.textTertiary}
            />
          </View>
          <Input
            label="Biographie"
            value={biography}
            onChangeText={setBiography}
            multiline
            numberOfLines={4}
            style={{ minHeight: 88, textAlignVertical: 'top' }}
          />
          <Input
            label="Site web"
            value={websiteUrl}
            onChangeText={setWebsiteUrl}
            autoCapitalize="none"
            keyboardType="url"
          />
        </ProfileSection>

        <Button title="Enregistrer mon profil" loading={save.isPending} onPress={() => save.mutate()} fullWidth size="lg" />
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
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[3],
  },
  toggleInfo: { flex: 1, gap: 2 },
  toggleLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  toggleHint: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textTertiary,
  },
  emploiHints: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginTop: -spacing[2] },
  hintChip: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.primary,
    textDecorationLine: 'underline',
  },
});
