import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Row } from '@/components/layout/primitives';
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
import { StaffPatientBookingConsentRow } from '@/features/patients/components/StaffPatientBookingConsentRow';
import { fontFamily, fontSize } from '@/theme/typography';

export type CreatedPatientResult = Pick<PatientRow, 'id' | 'first_name' | 'last_name'> & {
  phone?: string;
  email?: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onCreated?: (patient: CreatedPatientResult) => void;
  /** Dossier déjà existant — fermer sans effacer (liste rafraîchie côté parent). */
  onExistingPatient?: (patient: PatientRow) => void;
  stackBehavior?: 'push' | 'switch' | 'replace';
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

export function CreatePatientModal({
  visible,
  onClose,
  onCreated,
  onExistingPatient,
  stackBehavior,
}: Props) {
  const styles = useThemedStyles(buildStyles, 'features_patients_components_CreatePatientModal_tsx_styles');
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
  const [patientBookingConsent, setPatientBookingConsent] = useState(false);
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
    setPatientBookingConsent(false);
    setError(null);
    resetDuplicate();
  };

  useEffect(() => {
    if (!visible) reset();
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
    if (!patientBookingConsent) {
      setError('Veuillez confirmer le consentement du patient pour la prise de rendez-vous.');
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
        patient_booking_consent: true,
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
      onCreated?.({
        id: patientId,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
        ...(email.trim() ? { email: email.trim() } : {}),
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Nouveau patient"
      stackBehavior={stackBehavior}
    >
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

      <StaffPatientBookingConsentRow
        checked={patientBookingConsent}
        onToggle={() => setPatientBookingConsent((v) => !v)}
        error={error?.includes('consentement') ?? false}
      />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Row gap={spacing[3]} style={styles.actions}>
        <View style={styles.actionBtn}>
          <Button title="Annuler" variant="outline" onPress={onClose} fullWidth size="lg" />
        </View>
        <View style={styles.actionBtn}>
          <Button title="Créer" loading={loading} onPress={() => void submit()} fullWidth size="lg" />
        </View>
      </Row>

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
    marginTop: spacing[2],
  },
  actionBtn: {
    minWidth: 0,
    flex: 1,
  },
};
}

