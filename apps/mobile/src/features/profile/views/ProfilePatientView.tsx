import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Mail } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { BirthDatePicker } from '@/components/ui/BirthDatePicker';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { AddressAutocomplete } from '@/features/address/components/AddressAutocomplete';
import type { AddressPayload } from '@/features/appointments/form/types';
import { GenderSelect } from '@/features/auth/components/GenderSelect';
import { ProfileDocumentsSection } from '@/features/profile/components/ProfileDocumentsSection';
import { ProfileHero } from '@/features/profile/components/ProfileHero';
import { ProfileSection } from '@/features/profile/components/ProfileSection';
import { fetchUser, updateUser } from '@/features/profile/api/profile.service';
import { parseProfileAddress } from '@/features/profile/utils/parse-profile-address';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/providers/ToastProvider';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { colors, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

export function ProfilePatientView() {
  const user = useAuthStore((s) => s.user);
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const { show: toast } = useToast();
  const qc = useQueryClient();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('');
  const [address, setAddress] = useState<AddressPayload | null>(null);
  const [addressComplement, setAddressComplement] = useState('');

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
    setGender(d.gender ?? '');
    const parsed = parseProfileAddress(d.address);
    setAddress(parsed);
    setAddressComplement(parsed?.complement ?? '');
  }, [q.data]);

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

  if (q.isLoading) {
    return (
      <View style={styles.loading}>
        <Skeleton height={140} borderRadius={16} />
        <Skeleton height={180} borderRadius={16} />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
    >
      <ProfileHero
        firstName={firstName}
        lastName={lastName}
        email={user?.email}
        role="patient"
        profileImageUrl={q.data?.profile_image_url}
      />

      <ProfileSection title="Informations personnelles" Icon={FileText}>
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

      <ProfileDocumentsSection />

      <Button
        title="Enregistrer mon profil"
        loading={save.isPending}
        onPress={() => save.mutate()}
        fullWidth
        size="lg"
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing[4], gap: spacing[4], paddingBottom: spacing[12] },
  loading: { padding: spacing[4], gap: spacing[3] },
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
});
