import { useAppColors } from '@/theme/use-app-colors';
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { Cluster } from '@/components/layout/primitives';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Mail } from 'lucide-react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { BirthDatePicker } from '@/components/ui/BirthDatePicker';
import { Input } from '@/components/ui/Input';
import { SkeletonProfileScreen } from '@/components/ui/skeletons';
import { ProfileLoadState } from '@/features/profile/components/ProfileLoadState';
import { useProfileDraft } from '@/features/profile/hooks/useProfileDraft';
import { AddressAutocomplete } from '@/features/address/components/AddressAutocomplete';
import type { AddressPayload } from '@/features/appointments/form/types';
import { GenderSelect } from '@/features/auth/components/GenderSelect';
import { NirInput } from '@/features/profile/components/NirInput';
import { ProfileHero } from '@/features/profile/components/ProfileHero';
import { ProfilePhotosSheetContent } from '@/features/profile/components/ProfilePhotosSheetContent';
import { ProfileSecurityLinkRow } from '@/features/profile/components/ProfileSecurityLinkRow';
import { ProfileSection } from '@/features/profile/components/ProfileSection';
import { ProfileSubScreenLayout } from '@/features/profile/screens/ProfileSubScreenLayout';
import { fetchUser, updateProfileImages, updateUser } from '@/features/profile/api/profile.service';
import { normalizeNir, validateNir } from '@/features/profile/utils/nir';
import { parseProfileAddress } from '@/features/profile/utils/parse-profile-address';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/providers/ToastProvider';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { patientUiEmailLine } from '@/utils/patient-email-display';
import { radius, spacing, iconSize, AppText, useStyles, font, type Theme } from '@/theme';

export function ProfilePatientView() {
  const c = useAppColors();
  const styles = useStyles(buildStyles);

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
  const [showNirError, setShowNirError] = useState(false);

  const q = useQuery({
    queryKey: queryKeys.profile.user(user?.id ?? ''),
    queryFn: async () => (await fetchUser(user!.id)).data,
    enabled: !!user?.id,
  });

  const { dirty } = useProfileDraft(user?.id, q.data,
    { firstName, lastName, phone, birthDate, nir, gender, profileUrl, address, addressComplement },
    d => {
      const parsed = parseProfileAddress(d.address);
      return { firstName: d.first_name ?? '', lastName: d.last_name ?? '', phone: d.phone ?? '', birthDate: d.birth_date ?? '', nir: normalizeNir(d.nir ?? ''), gender: d.gender ?? '', profileUrl: d.profile_image_url ?? null, address: parsed, addressComplement: parsed?.complement ?? '' };
    },
    d => { setFirstName(d.firstName); setLastName(d.lastName); setPhone(d.phone); setBirthDate(d.birthDate); setNir(d.nir); setGender(d.gender); setProfileUrl(d.profileUrl); setAddress(d.address); setAddressComplement(d.addressComplement); },
    ['profileUrl'],
  );

  const nirChanged = nir !== normalizeNir(q.data?.nir ?? '');
  const nirError = nirChanged ? validateNir(nir) : null;

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
        nir: nir || null,
        gender: gender || null,
        address: addr,
      });
    },
    onSuccess: async () => {
      await fetchMe();
      await qc.invalidateQueries({ queryKey: queryKeys.profile.user(user!.id) });
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

  const onSave = () => {
    if (nirError) {
      setShowNirError(true);
      return;
    }
    save.mutate();
  };

  if (q.isLoading || !user?.id) {
    return <SkeletonProfileScreen cards={2} />;
  }
  if (q.isError || !q.data) return <ProfileLoadState refreshing={q.isFetching} error={q.error} onRetry={() => void q.refetch()} />;

  return (
    <ProfileSubScreenLayout
      saveTitle="Enregistrer mon profil"
      onSave={onSave}
      saving={save.isPending}
      dirty={dirty}
      overlay={
        <BottomSheet visible={photosOpen} onClose={() => setPhotosOpen(false)} title="Photo de profil">
          <ProfilePhotosSheetContent
            profileImageUrl={profileUrl}
            showCover={false}
            saving={savePhotos.isPending}
            onChangeProfile={onChangeProfilePhoto}
          />
        </BottomSheet>
      }
    >
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
            <AppText style={styles.fieldLabel}>Email</AppText>
            <Cluster
              gap={spacing[2]}
              leading={<Mail size={iconSize.sm} color={c.textTertiary} strokeWidth={2} />}
              style={styles.emailRow}
            >
              <AppText style={styles.emailText}>{emailShown}</AppText>
            </Cluster>
            <AppText style={styles.fieldHint}>
              L'email ne peut pas être modifié depuis l'application.
            </AppText>
          </View>
        ) : null}
        <Input label="Téléphone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <NirInput
          value={nir}
          onChange={(v) => {
            setNir(v);
            setShowNirError(false);
          }}
          error={showNirError ? nirError : null}
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
    </ProfileSubScreenLayout>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
  fieldLabel: {
    ...font.semiBold,
    fontSize: fontSize.sm,
    color: c.textPrimary,
  },
  fieldHint: {
    ...font.regular,
    fontSize: fontSize.xs,
    color: c.textTertiary,
    marginTop: spacing[1],
  },
  emailRow: {
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: c.borderLight,
    backgroundColor: c.surfaceAlt,
  },
  emailText: {
    minWidth: 0,
    flex: 1,
    ...font.regular,
    fontSize: fontSize.sm,
    color: c.textSecondary,
  },
};
}
