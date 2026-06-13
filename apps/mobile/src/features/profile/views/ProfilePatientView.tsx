import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Cluster } from '@/components/layout/primitives';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Mail } from 'lucide-react-native';
import { KeyboardScrollView } from '@/components/layout/KeyboardScrollView';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { BirthDatePicker } from '@/components/ui/BirthDatePicker';
import { Input } from '@/components/ui/Input';
import { SkeletonProfileScreen } from '@/components/ui/skeletons';
import { AddressAutocomplete } from '@/features/address/components/AddressAutocomplete';
import type { AddressPayload } from '@/features/appointments/form/types';
import { GenderSelect } from '@/features/auth/components/GenderSelect';
import { ProfileHero } from '@/features/profile/components/ProfileHero';
import { ProfilePhotosSheetContent } from '@/features/profile/components/ProfilePhotosSheetContent';
import { ProfileSecurityLinkRow } from '@/features/profile/components/ProfileSecurityLinkRow';
import { ProfileSection } from '@/features/profile/components/ProfileSection';
import { fetchUser, updateProfileImages, updateUser } from '@/features/profile/api/profile.service';
import { parseProfileAddress } from '@/features/profile/utils/parse-profile-address';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/providers/ToastProvider';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { patientUiEmailLine } from '@/utils/patient-email-display';
import { spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

export function ProfilePatientView() {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'features_profile_views_ProfilePatientView_tsx_ProfilePatientView_styles');

  const user = useAuthStore((s) => s.user);
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const { show: toast } = useToast();
  const qc = useQueryClient();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [nir, setNir] = useState('');
  const [gender, setGender] = useState('');
  const [address, setAddress] = useState<AddressPayload | null>(null);
  const [addressComplement, setAddressComplement] = useState('');
  const [photosOpen, setPhotosOpen] = useState(false);
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
    setBirthDate(d.birth_date ?? '');
    setNir(d.nir ?? '');
    setGender(d.gender ?? '');
    setProfileUrl(d.profile_image_url ?? null);
    const parsed = parseProfileAddress(d.address);
    setAddress(parsed);
    setAddressComplement(parsed?.complement ?? '');
  }, [q.data]);

  const emailShown = patientUiEmailLine({
    email: user?.email,
    email_display: (q.data as { email_display?: string | null } | undefined)?.email_display,
  });

  const save = useMutation({
    mutationFn: () => {
      const addr = address?.label
        ? {
            label: address.label.trim(),
            lat: address.lat,
            lng: address.lng,
            complement: addressComplement.trim() || undefined,
          }
        : null;
      return updateUser(user!.id, {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim() || null,
        birth_date: birthDate.trim() || null,
        nir: nir.trim() || null,
        gender: gender || null,
        address: addr,
      });
    },
    onSuccess: async () => {
      await fetchMe();
      void qc.invalidateQueries({ queryKey: queryKeys.profile.user(user!.id) });
      toast('Profil enregistré', { type: 'success' });
    },
    onError: (e) => handleApiError(e, toast, 'updateUser'),
  });

  const savePhotos = useMutation({
    mutationFn: (url: string | null) =>
      updateProfileImages(user!.id, { profile_image_url: url, cover_image_url: null }),
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

  if (q.isLoading) {
    return <SkeletonProfileScreen cards={2} />;
  }

  return (
    <>
      <KeyboardScrollView contentContainerStyle={styles.scroll}>
        <ProfileHero
          firstName={firstName}
          lastName={lastName}
          email={emailShown || undefined}
          role="patient"
          gender={gender || q.data?.gender}
          profileImageUrl={profileUrl}
          onEditPhotos={() => setPhotosOpen(true)}
        />

        <ProfileSection title="Informations personnelles" Icon={FileText}>
          <Input label="Prénom" value={firstName} onChangeText={setFirstName} autoCapitalize="words" />
          <Input label="Nom" value={lastName} onChangeText={setLastName} autoCapitalize="words" />
          {emailShown ? (
            <View>
              <Text style={styles.fieldLabel}>Email</Text>
              <Cluster
                gap={spacing[2]}
                leading={<Mail size={16} color={c.textTertiary} strokeWidth={2} />}
                style={styles.emailRow}
              >
                <Text style={styles.emailText}>{emailShown}</Text>
              </Cluster>
              <Text style={styles.fieldHint}>
                L'email ne peut pas être modifié depuis l'application.
              </Text>
            </View>
          ) : null}
          <Input label="Téléphone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <Input
            label="N° de sécurité sociale (NIR)"
            value={nir}
            onChangeText={setNir}
            placeholder="1 85 08 75 123 45 67"
            autoCapitalize="none"
          />
          <BirthDatePicker value={birthDate} onChange={setBirthDate} />
          <GenderSelect value={gender} onChange={setGender} />
          <AddressAutocomplete
            value={address}
            complement={addressComplement}
            onChange={setAddress}
            onComplementChange={setAddressComplement}
            label="Adresse"
          />
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

      <BottomSheet visible={photosOpen} onClose={() => setPhotosOpen(false)} title="Photo de profil">
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

function buildStyles(c: AppColors) {
  return {
  scroll: { padding: spacing[4], gap: spacing[4], paddingBottom: spacing[12] },
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
