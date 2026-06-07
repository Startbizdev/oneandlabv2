import type { AppColors } from '@/theme/colors';
import { getThemedStyles } from '@/theme/use-themed-styles';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { PatientDuplicatePrompt } from '@/features/appointments/form/components/PatientDuplicatePrompt';
import { usePatientDuplicateDetection } from '@/features/patients/hooks/use-patient-duplicate-detection';
import type { PatientRow } from '@/features/patients/api/fetch-all-patients';
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
import { colors, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

type Props = {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
  /** Dossier déjà existant — fermer sans effacer (liste rafraîchie côté parent). */
  onExistingPatient?: (patient: PatientRow) => void;
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

export function CreatePatientModal({ visible, onClose, onCreated, onExistingPatient }: Props) {
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
  const {
    duplicateOpen,
    duplicateRow,
    dismissDuplicate,
    resetDuplicate,
  } = usePatientDuplicateDetection(email, phone, visible);

  const reset = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    setAddress(null);
    setAddressComplement('');
    setPersonalFiles({});
    setError(null);
    resetDuplicate();
  };

  useEffect(() => {
    if (!visible) reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset à la fermeture uniquement
  }, [visible]);

  const submit = async () => {
    if (duplicateOpen && duplicateRow) {
      setError('Ce patient existe déjà — utilisez le dossier existant.');
      return;
    }
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
    <BottomSheet visible={visible} onClose={onClose} title="Nouveau patient">
      {duplicateOpen && duplicateRow ? (
        <PatientDuplicatePrompt
          patient={duplicateRow}
          variant="create"
          onDismiss={dismissDuplicate}
          onUseExisting={() => {
            if (!duplicateRow) return;
            dismissDuplicate();
            onExistingPatient?.(duplicateRow);
            onClose();
          }}
        />
      ) : null}
      <View style={styles.fields}>
        <Input label="Prénom" value={firstName} onChangeText={setFirstName} autoCapitalize="words" />
        <Input label="Nom" value={lastName} onChangeText={setLastName} autoCapitalize="words" />
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
        onChange={(key, file) => setPersonalFiles((prev) => ({ ...prev, [key]: file }))}
      />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.actions}>
        <View style={styles.actionBtn}>
          <Button title="Annuler" variant="outline" onPress={onClose} fullWidth size="lg" />
        </View>
        <View style={styles.actionBtn}>
          <Button title="Créer" loading={loading} onPress={() => void submit()} fullWidth size="lg" />
        </View>
      </View>

    </BottomSheet>
  );
}

function buildStyles(c: AppColors) {
  return {
  fields: { gap: spacing[3] },
  errorText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: c.error,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[2],
  },
  actionBtn: {
    flex: 1,
  },
};
}

const styles = new Proxy({} as Record<string, any>, {
  get(_target, prop: string | symbol) {
    if (typeof prop === 'string') {
      return getThemedStyles('features_patients_components_CreatePatientModal_tsx_styles', buildStyles)[prop];
    }
    return undefined;
  },
});
