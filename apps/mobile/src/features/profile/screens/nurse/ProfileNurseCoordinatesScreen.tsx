import {
  getProfessionalIdDisplay,
  normalizeProfessionalId,
  splitProfessionalId,
  validateProfessionalId,
  PROFESSIONAL_ID_LABEL,
} from '@oneandlab/shared-types';
import { useCallback, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/Input';
import { ProfileEmailField } from '@/features/profile/components/ProfileEmailField';
import { AddressAutocomplete } from '@/features/address/components/AddressAutocomplete';
import type { AddressPayload } from '@/features/appointments/form/types';
import { GenderSelect } from '@/features/auth/components/GenderSelect';
import { ProfileSubScreenLayout } from '@/features/profile/screens/ProfileSubScreenLayout';
import { ProfileLoadState } from '@/features/profile/components/ProfileLoadState';
import { useProfileDraft } from '@/features/profile/hooks/useProfileDraft';
import { fetchUser, updateUser } from '@/features/profile/api/profile.service';
import { parseProfileAddress } from '@/features/profile/utils/parse-profile-address';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/providers/ToastProvider';
import { handleApiError } from '@/lib/errors/handle-api-error';

export function ProfileNurseCoordinatesScreen() {
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
  const [errors, setErrors] = useState<{ gender?: string; professionalId?: string }>({});

  const q = useQuery({
    queryKey: queryKeys.profile.fullUser(user?.id ?? ''),
    queryFn: async () => (await fetchUser(user!.id, 'full')).data,
    enabled: !!user?.id,
  });

  const { dirty } = useProfileDraft(user?.id, q.data, { firstName, lastName, phone, gender, professionalId, address, addressComplement },
    d => {
      const parsed = parseProfileAddress(d.address);
      return { firstName: d.first_name ?? '', lastName: d.last_name ?? '', phone: d.phone ?? '', gender: d.gender ?? '', professionalId: getProfessionalIdDisplay(d.rpps, d.adeli), address: parsed, addressComplement: parsed?.complement ?? '' };
    },
    d => { setFirstName(d.firstName); setLastName(d.lastName); setPhone(d.phone); setGender(d.gender); setProfessionalId(d.professionalId); setAddress(d.address); setAddressComplement(d.addressComplement); },
  );

  const onAddressChange = useCallback((addr: AddressPayload | null) => {
    setAddress(addr);
    if (addr?.complement != null) setAddressComplement(addr.complement);
  }, []);

  const save = useMutation({
    mutationFn: async () => {
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
      await qc.invalidateQueries({ queryKey: queryKeys.profile.user(user!.id) });
      toast('Coordonnées enregistrées', { type: 'success' });
    },
    onError: (e) => handleApiError(e, toast, 'updateUser'),
  });

  const onSave = () => {
    const next = {
      gender: gender.trim() ? undefined : 'Indiquez Homme, Femme ou Autre pour le matching des RDV soins.',
      professionalId: validateProfessionalId(professionalId) ?? undefined,
    };
    setErrors(next);
    if (next.gender || next.professionalId) return;
    save.mutate();
  };

  if (q.isLoading || q.isError || !q.data) return <ProfileLoadState loading={q.isLoading || !user?.id} refreshing={q.isFetching} error={q.error} onRetry={() => void q.refetch()} />;

  return (
    <ProfileSubScreenLayout
      saving={save.isPending}
      onSave={onSave}
      saveTitle="Enregistrer"
      dirty={dirty}
    >
      <Input label="Prénom" value={firstName} onChangeText={setFirstName} autoCapitalize="words" />
      <Input label="Nom" value={lastName} onChangeText={setLastName} autoCapitalize="words" />
      <ProfileEmailField email={user?.email} />
      <Input label="Téléphone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <GenderSelect
        value={gender}
        onChange={(v) => {
          setGender(v);
          setErrors((e) => ({ ...e, gender: undefined }));
        }}
        error={errors.gender}
      />
      <Input
        label={PROFESSIONAL_ID_LABEL}
        value={professionalId}
        onChangeText={(v) => {
          setProfessionalId(v);
          setErrors((e) => ({ ...e, professionalId: undefined }));
        }}
        keyboardType="number-pad"
        maxLength={11}
        hint="9 chiffres (Adeli) ou 11 chiffres (RPPS)"
        error={errors.professionalId}
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
