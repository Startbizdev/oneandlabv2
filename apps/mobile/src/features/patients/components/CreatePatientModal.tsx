import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { AddressAutocomplete } from '@/features/address/components/AddressAutocomplete';
import { WizardDocumentFields } from '@/features/appointments/form/components/WizardDocumentFields';
import { PERSONAL_DOC_FIELDS } from '@/features/appointments/form/constants/appointment-document-fields';
import type { AddressPayload } from '@/features/appointments/form/types';
import type { DocumentFileRef } from '@/features/appointments/form/types/document-file-ref';
import { createPatient } from '../api/patients.service';
import {
  uploadPatientProfileDocument,
  type PatientProfileUploadType,
} from '../api/patient-profile.service';
import { colors, elevation, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

type Props = {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
};

function addressForApi(
  address: AddressPayload | null,
  complement: string,
): Record<string, unknown> | undefined {
  if (!address?.label?.trim()) return undefined;
  return {
    label: address.label.trim(),
    lat: address.lat,
    lng: address.lng,
    ...(address.city ? { city: address.city } : {}),
    ...(address.postal_code ? { postal_code: address.postal_code } : {}),
    ...(complement.trim() ? { complement: complement.trim() } : {}),
  };
}

export function CreatePatientModal({ visible, onClose, onCreated }: Props) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState<AddressPayload | null>(null);
  const [addressComplement, setAddressComplement] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [personalFiles, setPersonalFiles] = useState<
    Record<string, DocumentFileRef | undefined>
  >({});

  const reset = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    setAddress(null);
    setAddressComplement('');
    setPersonalFiles({});
    setError(null);
  };

  const submit = async () => {
    if (!firstName.trim() || !lastName.trim() || !phone.trim()) {
      setError('Prénom, nom et téléphone sont requis.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const addr = addressForApi(address, addressComplement);
      const res = await createPatient({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
        ...(email.trim() ? { email: email.trim() } : {}),
        ...(addr ? { address: addr } : {}),
      });
      if (!res.success || !res.data?.id) throw new Error(res.error ?? 'Création impossible');
      const patientId = res.data.id;
      for (const [key, file] of Object.entries(personalFiles)) {
        if (!file || !('uri' in file)) continue;
        try {
          await uploadPatientProfileDocument(
            patientId,
            key as PatientProfileUploadType,
            {
              uri: file.uri,
              fileName: file.name,
              mimeType: file.mimeType ?? 'image/jpeg',
            },
          );
        } catch {
          /* non bloquant */
        }
      }
      reset();
      onCreated();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable
          style={styles.dismissArea}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Fermer"
        />
        <View style={[styles.sheet, elevation.sheetTop]}>
          <View style={styles.handleWrap}>
            <View style={styles.handle} />
          </View>

          <Text style={styles.title}>Nouveau patient</Text>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.fields}>
              <Input
                label="Prénom"
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
              />
              <Input
                label="Nom"
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
              />
              <Input
                label="Téléphone"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
              <Input
                label="Email (optionnel)"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <AddressAutocomplete
                label="Adresse (optionnel)"
                value={address}
                complement={addressComplement}
                onChange={setAddress}
                onComplementChange={setAddressComplement}
              />
            </View>

            <WizardDocumentFields
              title="Documents (optionnel)"
              subtitle="Carte Vitale, mutuelle…"
              fields={PERSONAL_DOC_FIELDS}
              files={personalFiles}
              onChange={(key, file) =>
                setPersonalFiles((prev) => ({ ...prev, [key]: file }))
              }
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </ScrollView>

          <View style={styles.actions}>
            <View style={styles.actionBtn}>
              <Button title="Annuler" variant="outline" onPress={onClose} fullWidth />
            </View>
            <View style={styles.actionBtn}>
              <Button title="Créer" loading={loading} onPress={() => void submit()} fullWidth />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  dismissArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius['3xl'],
    borderTopRightRadius: radius['3xl'],
    padding: spacing[5],
    paddingBottom: spacing[8],
    gap: spacing[4],
    overflow: 'visible',
  },
  handleWrap: {
    alignItems: 'center',
    marginBottom: spacing[1],
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.border,
  },
  title: {
    fontFamily: fontFamily.extraBold,
    fontSize: fontSize['2xl'],
    color: colors.textPrimary,
    letterSpacing: -0.6,
  },
  scroll: { maxHeight: 480 },
  scrollContent: { gap: spacing[4], paddingBottom: spacing[2] },
  fields: { gap: spacing[3] },
  errorText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: colors.error,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  actionBtn: {
    flex: 1,
  },
});
