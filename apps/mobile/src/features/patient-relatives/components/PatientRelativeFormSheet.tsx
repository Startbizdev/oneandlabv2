import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { BirthDatePicker } from '@/components/ui/BirthDatePicker';
import { AddressAutocomplete } from '@/features/address/components/AddressAutocomplete';
import type { AddressPayload } from '@/features/appointments/form/types';
import { GenderSelect } from '@/features/auth/components/GenderSelect';
import { RELATIONSHIP_OPTIONS } from '../constants/relationship-types';
import type { PatientRelative } from '../api/patient-relatives.service';
import { colors, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

type Props = {
  visible: boolean;
  initial?: PatientRelative | null;
  saving?: boolean;
  onClose: () => void;
  onSubmit: (body: {
    first_name: string;
    last_name: string;
    relationship_type: string;
    gender?: string;
    birth_date?: string;
    email?: string;
    phone?: string;
    address?: AddressPayload | null;
  }) => void;
};

export function PatientRelativeFormSheet({
  visible,
  initial,
  saving,
  onClose,
  onSubmit,
}: Props) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [relationshipType, setRelationshipType] = useState('child');
  const [gender, setGender] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState<AddressPayload | null>(null);
  const [addressComplement, setAddressComplement] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setFirstName(initial?.first_name ?? '');
    setLastName(initial?.last_name ?? '');
    setRelationshipType(initial?.relationship_type ?? initial?.relationship ?? 'child');
    setGender(initial?.gender ?? '');
    setBirthDate(initial?.birth_date ?? '');
    setEmail(initial?.email ?? '');
    setPhone(initial?.phone ?? '');
    const addr = initial?.address ?? null;
    setAddress(addr);
    setAddressComplement(
      typeof addr === 'object' && addr && 'complement' in addr
        ? String((addr as AddressPayload).complement ?? '')
        : '',
    );
    setError(null);
  }, [visible, initial]);

  const submit = () => {
    if (!firstName.trim() || !lastName.trim() || !relationshipType) {
      setError('Prénom, nom et lien sont requis.');
      return;
    }
    const addr = address?.label
      ? {
          label: address.label.trim(),
          lat: address.lat,
          lng: address.lng,
          complement: addressComplement.trim() || undefined,
          ...(address.city ? { city: address.city } : {}),
          ...(address.postal_code ? { postal_code: address.postal_code } : {}),
        }
      : null;
    onSubmit({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      relationship_type: relationshipType,
      gender: gender || undefined,
      birth_date: birthDate.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      address: addr,
    });
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={initial ? 'Modifier le proche' : 'Ajouter un proche'}
    >
      <View style={styles.fields}>
        <Input label="Prénom" value={firstName} onChangeText={setFirstName} autoCapitalize="words" />
        <Input label="Nom" value={lastName} onChangeText={setLastName} autoCapitalize="words" />
        <View>
          <Text style={styles.label}>Lien de parenté</Text>
          <View style={styles.pills}>
            {RELATIONSHIP_OPTIONS.map((o) => {
              const active = relationshipType === o.value;
              return (
                <Text
                  key={o.value}
                  onPress={() => setRelationshipType(o.value)}
                  style={[styles.pill, active && styles.pillActive]}
                >
                  {o.label}
                </Text>
              );
            })}
          </View>
        </View>
        <GenderSelect value={gender} onChange={setGender} />
        <BirthDatePicker value={birthDate} onChange={setBirthDate} />
        <Input label="Téléphone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Input
          label="Email (optionnel)"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <AddressAutocomplete
          label="Adresse"
          value={address}
          complement={addressComplement}
          onChange={setAddress}
          onComplementChange={setAddressComplement}
        />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.actions}>
        <View style={styles.actionBtn}>
          <Button title="Annuler" variant="outline" onPress={onClose} fullWidth />
        </View>
        <View style={styles.actionBtn}>
          <Button
            title={initial ? 'Enregistrer' : 'Ajouter'}
            loading={saving}
            onPress={submit}
            fullWidth
          />
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  fields: { gap: spacing[3] },
  label: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    marginBottom: spacing[2],
  },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  pill: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surfaceAlt,
  },
  pillActive: {
    color: colors.primary,
    borderColor: colors.primaryMid,
    backgroundColor: colors.primaryLight,
  },
  error: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: colors.error,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[2],
    paddingTop: spacing[3],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
  },
  actionBtn: { flex: 1 },
});
