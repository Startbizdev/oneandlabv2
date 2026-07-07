import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { BirthDatePicker } from '@/components/ui/BirthDatePicker';
import { Input } from '@/components/ui/Input';
import { SkeletonList } from '@/components/ui/skeletons';
import { AddressAutocomplete } from '@/features/address/components/AddressAutocomplete';
import type { AddressPayload } from '@/features/appointments/form/types';
import { GenderSelect } from '@/features/auth/components/GenderSelect';
import { fetchUser, updateUser } from '@/features/profile/api/profile.service';
import { parseProfileAddress } from '@/features/profile/utils/parse-profile-address';
import { queryKeys } from '@/lib/query-keys';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { useToast } from '@/providers/ToastProvider';
import { spacing, AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

type Props = {
  visible: boolean;
  patientId: string;
  onClose: () => void;
  onSaved?: () => void;
};

export function StaffPatientEditSheet({ visible, patientId, onClose, onSaved }: Props) {
  const styles = useThemedStyles(buildStyles, 'StaffPatientEditSheet');
  const { show: toast } = useToast();
  const qc = useQueryClient();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('');
  const [nir, setNir] = useState('');
  const [address, setAddress] = useState<AddressPayload | null>(null);
  const [addressComplement, setAddressComplement] = useState('');

  const profileQ = useQuery({
    queryKey: queryKeys.profile.user(patientId),
    queryFn: async () => (await fetchUser(patientId, 'full')).data,
    enabled: visible && Boolean(patientId),
  });

  useEffect(() => {
    const d = profileQ.data;
    if (!d || !visible) return;
    setFirstName(d.first_name ?? '');
    setLastName(d.last_name ?? '');
    setPhone(d.phone ?? '');
    setBirthDate(d.birth_date ?? '');
    setGender(d.gender ?? '');
    setNir(d.nir ?? '');
    const parsed = parseProfileAddress(d.address);
    setAddress(parsed);
    setAddressComplement(parsed?.complement ?? '');
  }, [profileQ.data, visible]);

  const saveMut = useMutation({
    mutationFn: () => {
      const addr = address?.label
        ? {
            label: address.label.trim(),
            lat: address.lat,
            lng: address.lng,
            complement: addressComplement.trim() || undefined,
          }
        : null;
      return updateUser(patientId, {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim() || null,
        birth_date: birthDate.trim() || null,
        gender: gender || null,
        nir: nir.trim() || null,
        address: addr,
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: queryKeys.profile.user(patientId) });
      await qc.invalidateQueries({ queryKey: ['prescriptions', 'patients'] });
      toast('Fiche patient enregistrée', { type: 'success' });
      onSaved?.();
      onClose();
    },
    onError: (e) => handleApiError(e, toast, 'update-patient'),
  });

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Fiche patient"
      subtitle="Modifier les informations du patient"
      stackBehavior="push"
      snapPoints={['92%']}
      footer={
        <Button title="Enregistrer" loading={saveMut.isPending} onPress={() => saveMut.mutate()} />
      }
    >
      {profileQ.isLoading ? (
        <SkeletonList count={4} itemHeight={48} gap={spacing[2]} />
      ) : (
        <View style={styles.form}>
          <Input label="Prénom" value={firstName} onChangeText={setFirstName} autoCapitalize="words" />
          <Input label="Nom" value={lastName} onChangeText={setLastName} autoCapitalize="words" />
          <Input
            label="Téléphone"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
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
          <AppText style={styles.hint}>
            L’email ne peut pas être modifié depuis l’application.
          </AppText>
        </View>
      )}
    </BottomSheet>
  );
}

function buildStyles(c: AppColors) {
  return {
    form: { gap: spacing[3] },
    hint: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.xs,
      color: c.textTertiary,
      lineHeight: 18,
    },
  };
}
