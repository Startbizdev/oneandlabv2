import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import {
  getProfessionalIdDisplay,
  normalizeProfessionalId,
  splitProfessionalId,
  validateProfessionalId,
  PROFESSIONAL_ID_LABEL,
} from '@oneandlab/shared-types';
import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Cluster } from '@/components/layout/primitives';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Mail } from 'lucide-react-native';
import { Input } from '@/components/ui/Input';
import { AddressAutocomplete } from '@/features/address/components/AddressAutocomplete';
import type { AddressPayload } from '@/features/appointments/form/types';
import { GenderSelect } from '@/features/auth/components/GenderSelect';
import { ProfileSubScreenLayout } from '@/features/profile/screens/ProfileSubScreenLayout';
import { fetchUser, updateUser } from '@/features/profile/api/profile.service';
import { parseProfileAddress } from '@/features/profile/utils/parse-profile-address';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/providers/ToastProvider';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

function buildFieldStyles(c: AppColors) {
  return {
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

export function ProfileNurseCoordinatesScreen() {
  const c = useAppColors();
  const fieldStyles = useThemedStyles(buildFieldStyles, 'ProfileNurseCoordinatesScreen.fieldStyles');
  const user = useAuthStore((s) => s.user);
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const { show: toast } = useToast();
  const qc = useQueryClient();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('');
  const [professionalId, setProfessionalId] = useState('');
  const [address, setAddress] = useState<AddressPayload | null>(null);
  const [addressComplement, setAddressComplement] = useState('');

  const q = useQuery({
    queryKey: queryKeys.profile.user(user?.id ?? ''),
    queryFn: async () => (await fetchUser(user!.id, 'full')).data,
    enabled: !!user?.id,
  });

  useEffect(() => {
    const d = q.data;
    if (!d) return;
    setFirstName(d.first_name ?? '');
    setLastName(d.last_name ?? '');
    setPhone(d.phone ?? '');
    setGender(d.gender ?? '');
    setProfessionalId(getProfessionalIdDisplay(d.rpps, d.adeli));
    const parsed = parseProfileAddress(d.address);
    setAddress(parsed);
    setAddressComplement(parsed?.complement ?? '');
  }, [q.data]);

  const onAddressChange = useCallback((addr: AddressPayload | null) => {
    setAddress(addr);
    if (addr?.complement != null) setAddressComplement(addr.complement);
  }, []);

  const save = useMutation({
    mutationFn: async () => {
      if (!gender.trim()) throw new Error('GENDER_REQUIRED');
      const profErr = validateProfessionalId(professionalId);
      if (profErr) throw new Error(`PROFESSIONAL_ID:${profErr}`);
      const split = splitProfessionalId(professionalId);
      const addr = address?.label
        ? {
            label: address.label.trim(),
            lat: address.lat,
            lng: address.lng,
            complement: addressComplement.trim() || undefined,
          }
        : null;
      await updateUser(user!.id, {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim() || null,
        gender: gender || null,
        professional_id: normalizeProfessionalId(professionalId) || null,
        rpps: split.rpps,
        adeli: split.adeli,
        address: addr,
      });
    },
    onSuccess: async () => {
      await fetchMe();
      void qc.invalidateQueries({ queryKey: queryKeys.profile.user(user!.id) });
      toast('Coordonnées enregistrées', { type: 'success' });
    },
    onError: (e) => {
      if (e instanceof Error && e.message === 'GENDER_REQUIRED') {
        toast('Genre requis', {
          type: 'error',
          message: 'Indiquez Homme, Femme ou Autre pour le matching des RDV soins.',
        });
        return;
      }
      if (e instanceof Error && e.message.startsWith('PROFESSIONAL_ID:')) {
        toast('Identifiant invalide', {
          type: 'error',
          message: e.message.replace('PROFESSIONAL_ID:', ''),
        });
        return;
      }
      handleApiError(e, toast, 'updateUser');
    },
  });

  return (
    <ProfileSubScreenLayout
      saving={save.isPending}
      onSave={() => save.mutate()}
      saveTitle="Enregistrer"
    >
      <Input label="Prénom" value={firstName} onChangeText={setFirstName} autoCapitalize="words" />
      <Input label="Nom" value={lastName} onChangeText={setLastName} autoCapitalize="words" />
      <View>
        <Text style={fieldStyles.fieldLabel}>Email</Text>
        <Cluster
          gap={spacing[2]}
          leading={<Mail size={16} color={c.textTertiary} strokeWidth={2} />}
          style={fieldStyles.emailRow}
        >
          <Text style={fieldStyles.emailText}>{user?.email ?? '—'}</Text>
        </Cluster>
        <Text style={fieldStyles.fieldHint}>L'email ne peut pas être modifié depuis l'application.</Text>
      </View>
      <Input label="Téléphone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <GenderSelect value={gender} onChange={setGender} />
      <Input
        label={PROFESSIONAL_ID_LABEL}
        value={professionalId}
        onChangeText={setProfessionalId}
        keyboardType="number-pad"
        maxLength={11}
        hint="9 chiffres (Adeli) ou 11 chiffres (RPPS)"
      />
      <AddressAutocomplete
        value={address}
        complement={addressComplement}
        onChange={onAddressChange}
        onComplementChange={setAddressComplement}
        label="Adresse professionnelle"
      />
    </ProfileSubScreenLayout>
  );
}
