import type { AppColors } from '@/theme/colors';
import { getThemedStyles } from '@/theme/use-themed-styles';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
                <Pressable
                  key={o.value}
                  onPress={() => setRelationshipType(o.value)}
                  style={[styles.pill, active && styles.pillActive]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={o.label}
                >
                  <Text style={[styles.pillText, active && styles.pillTextActive]}>{o.label}</Text>
                </Pressable>
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
          <Button title="Annuler" variant="outline" onPress={onClose} fullWidth size="lg" />
        </View>
        <View style={styles.actionBtn}>
          <Button
            title={initial ? 'Enregistrer' : 'Ajouter'}
            loading={saving}
            onPress={submit}
            fullWidth
            size="lg"
          />
        </View>
      </View>
    </BottomSheet>
  );
}

function buildStyles(c: AppColors) {
  return {
  fields: { gap: spacing[3] },
  label: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
    color: c.textPrimary,
    marginBottom: spacing[2],
    lineHeight: fontSize.base * 1.3,
  },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  pill: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.borderLight,
    backgroundColor: c.surfaceAlt,
  },
  pillActive: {
    borderColor: c.primaryMid,
    backgroundColor: c.primaryLight,
  },
  pillText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: c.textSecondary,
    lineHeight: fontSize.sm * 1.35,
  },
  pillTextActive: {
    color: c.primary,
    fontFamily: fontFamily.semiBold,
  },
  error: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: c.error,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[2],
    paddingTop: spacing[3],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.borderLight,
  },
  actionBtn: { flex: 1 },
};
}

const styles = new Proxy({} as Record<string, any>, {
  get(_target, prop: string | symbol) {
    if (typeof prop === 'string') {
      return getThemedStyles('features_patient_relatives_components_PatientRelativeFormSheet_tsx_styles', buildStyles)[prop];
    }
    return undefined;
  },
});
