import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Row } from '@/components/layout/primitives';
import { SheetModal } from '@/components/ui/SheetModal';
import { Button } from '@/components/ui/Button';
import { PatientDuplicatePrompt } from '@/features/appointments/form/components/PatientDuplicatePrompt';
import { usePatientDuplicateDetection } from '@/features/patients/hooks/use-patient-duplicate-detection';
import type { PatientRow } from '@/features/patients/api/fetch-all-patients';
import { AddressAutocomplete } from '@/features/address/components/AddressAutocomplete';
import { WizardDocumentFields } from '@/features/appointments/form/components/WizardDocumentFields';
import { PERSONAL_DOC_FIELDS } from '@/features/appointments/form/constants/appointment-document-fields';
import type { AddressPayload } from '@/features/appointments/form/types';
import type { DocumentFileRef } from '@/features/appointments/form/types/document-file-ref';
import { adoptStaffPatient, createPatient } from '../api/patients.service';
import { lookupPatientByContact, patientRowFromLookup } from '../api/patient-lookup.service';
import {
  isEmailAlreadyUsedError,
  patientAdoptErrorMessage,
  patientCreateErrorMessage,
} from '@oneandlab/shared-api';
import { isPatientPhoneOptionalForCreator } from '@oneandlab/shared-constants';
import { ApiRequestError } from '@/lib/errors/api-request-error';
import { apiErrorMessage } from '@/lib/errors/handle-api-error';
import { queryKeys } from '@/lib/query-keys';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/providers/ToastProvider';
import { uploadPatientProfileDocuments } from '../api/patient-profile.service';
import { createPatientBody } from '../utils/create-patient-body';
import type { PatientContactDraft } from '@/lib/contacts/patient-draft-from-contact';
import { PatientContactImportButton } from './PatientContactImportButton';
import { EMPTY_PATIENT_CONTACT, PatientContactFields, type PatientContactValues } from './PatientContactFields';
import { StaffPatientBookingConsentRow } from '@/features/patients/components/StaffPatientBookingConsentRow';
import { spacing, AppText, useStyles, font, type Theme } from '@/theme';

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
  /** Recherche de doublon (`/patients/lookup`, réservée pro / infirmier / labo). */
  detectDuplicates?: boolean;
};

export function CreatePatientModal({
  visible,
  onClose,
  onCreated,
  onExistingPatient,
  detectDuplicates = true,
}: Props) {
  const styles = useStyles(buildStyles);
  const qc = useQueryClient();
  const { show: toast } = useToast();
  const phoneOptional = isPatientPhoneOptionalForCreator(useAuthStore((s) => s.user?.role));
  const [contact, setContact] = useState<PatientContactValues>(EMPTY_PATIENT_CONTACT);
  const { firstName, lastName, email, phone } = contact;
  const [address, setAddress] = useState<AddressPayload | null>(null);
  const [addressComplement, setAddressComplement] = useState('');
  const [addressPrefill, setAddressPrefill] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [personalFiles, setPersonalFiles] = useState<
    Record<string, DocumentFileRef | undefined>
  >({});
  const [patientBookingConsent, setPatientBookingConsent] = useState(false);
  const [consentError, setConsentError] = useState(false);
  const [adopting, setAdopting] = useState(false);
  /** Résultat transmis au parent une fois la sheet retirée (il peut naviguer ou ouvrir une autre sheet). */
  const pendingResultRef = useRef<(() => void) | null>(null);
  const { duplicate, dismissDuplicate, resetDuplicate, showDuplicate } = usePatientDuplicateDetection(
    email,
    phone,
    visible && detectDuplicates,
  );

  const reset = useCallback(() => {
    setContact(EMPTY_PATIENT_CONTACT);
    setAddress(null);
    setAddressComplement('');
    setAddressPrefill('');
    setPersonalFiles({});
    setPatientBookingConsent(false);
    setConsentError(false);
    setError(null);
    resetDuplicate();
  }, [resetDuplicate]);

  useEffect(() => {
    if (!visible) reset();
  }, [visible, reset]);

  const toggleConsent = () => {
    setPatientBookingConsent((v) => !v);
    setConsentError(false);
  };

  const applyContactDraft = ({ addressQuery, ...draftContact }: PatientContactDraft) => {
    setContact(draftContact);
    if (addressQuery) {
      setAddress(null);
      setAddressComplement('');
      setAddressPrefill(addressQuery);
    }
    setError(null);
  };

  const adoptExistingPatient = async () => {
    if (!duplicate || adopting) return;
    if (!patientBookingConsent) {
      setConsentError(true);
      setError('Cochez le consentement du patient pour utiliser ce dossier.');
      return;
    }
    setAdopting(true);
    setError(null);
    try {
      const res = await adoptStaffPatient(duplicate.patient.id, duplicate.contact, true);
      if (!res.success) throw new Error(res.error ?? 'Impossible d’utiliser ce dossier.');
      await Promise.all([
        qc.invalidateQueries({ queryKey: queryKeys.patients.all }),
        qc.invalidateQueries({ queryKey: ['patients', 'hub-search'] }),
        qc.invalidateQueries({ queryKey: ['prescriptions', 'patients'] }),
      ]);
      const row = patientRowFromLookup(duplicate.patient);
      resetDuplicate();
      pendingResultRef.current = () => onExistingPatient?.(row);
      onClose();
    } catch (e) {
      setError(apiErrorMessage(e, patientAdoptErrorMessage, 'Impossible d’utiliser ce dossier.'));
    } finally {
      setAdopting(false);
    }
  };

  /** 409 `EMAIL_ALREADY_USED` : propose le dossier existant si la recherche par e-mail le retrouve. */
  const proposeExistingByEmail = async (existingPatientId: string | undefined) => {
    if (!detectDuplicates || !existingPatientId || !email.trim()) return;
    try {
      const found = await lookupPatientByContact(email, '');
      if (found?.patient.id === existingPatientId) showDuplicate(found);
    } catch (e) {
      console.warn('[patients] existing patient lookup failed', e);
    }
  };

  /** Documents envoyés après la création : un échec n'annule pas le patient, il est signalé. */
  const uploadPersonalFiles = async (patientId: string) => {
    const failed = await uploadPatientProfileDocuments(patientId, personalFiles);
    if (failed > 0) {
      toast(
        failed === 1
          ? 'Patient créé, mais un document n’a pas pu être envoyé. Ajoutez-le depuis sa fiche.'
          : 'Patient créé, mais des documents n’ont pas pu être envoyés. Ajoutez-les depuis sa fiche.',
        { type: 'warning' },
      );
    }
  };

  const submit = async () => {
    if (duplicate) {
      setError('Ce patient existe déjà — utilisez le dossier existant.');
      return;
    }
    if (!firstName.trim() || !lastName.trim() || (!phoneOptional && !phone.trim())) {
      setError(phoneOptional ? 'Prénom et nom sont requis.' : 'Prénom, nom et téléphone sont requis.');
      return;
    }
    if (!patientBookingConsent) {
      setConsentError(true);
      setError('Veuillez confirmer le consentement du patient pour la prise de rendez-vous.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await createPatient(
        createPatientBody({
          ...contact,
          address,
          addressComplement,
        }),
      );
      if (!res.success || !res.data?.id) throw new Error(res.error ?? 'Création impossible');
      const patientId = res.data.id;
      await uploadPersonalFiles(patientId);
      const created: CreatedPatientResult = {
        id: patientId,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        ...(email.trim() ? { email: email.trim() } : {}),
      };
      reset();
      pendingResultRef.current = () => onCreated?.(created);
      onClose();
    } catch (e) {
      setError(apiErrorMessage(e, patientCreateErrorMessage, 'Création impossible'));
      if (e instanceof ApiRequestError && isEmailAlreadyUsedError(e.status, e.code)) {
        await proposeExistingByEmail(e.existingPatientId);
      }
    } finally {
      setLoading(false);
    }
  };

  const consentRow = (
    <StaffPatientBookingConsentRow
      checked={patientBookingConsent}
      onToggle={toggleConsent}
      error={consentError}
    />
  );
  const errorText = error ? <AppText style={styles.errorText}>{error}</AppText> : null;

  return (
    <SheetModal
      visible={visible}
      onClose={onClose}
      onDismissed={() => {
        const deliver = pendingResultRef.current;
        pendingResultRef.current = null;
        deliver?.();
      }}
      dismissible={!loading && !adopting}
      title="Nouveau patient"
      snapPoints={['92%']}
      footer={
        <>
          {duplicate ? null : errorText}
          <Row gap={spacing[3]}>
            <View style={styles.actionBtn}>
              <Button title="Annuler" variant="outline" onPress={onClose} fullWidth size="lg" />
            </View>
            <View style={styles.actionBtn}>
              <Button title="Créer" loading={loading} onPress={() => void submit()} fullWidth size="lg" />
            </View>
          </Row>
        </>
      }
    >
      {duplicate ? (
        <PatientDuplicatePrompt
          patient={duplicate.patient}
          variant="create"
          adopting={adopting}
          onDismiss={dismissDuplicate}
          onUseExisting={() => void adoptExistingPatient()}
        >
          {consentRow}
          {errorText}
        </PatientDuplicatePrompt>
      ) : null}
      <PatientContactImportButton onImported={applyContactDraft} />
      <View style={styles.fields}>
        <PatientContactFields
          values={contact}
          phoneOptional={phoneOptional}
          onChange={(patch) => setContact((prev) => ({ ...prev, ...patch }))}
        />
        <AddressAutocomplete
          label="Adresse (optionnel)"
          value={address}
          complement={addressComplement}
          onChange={setAddress}
          onComplementChange={setAddressComplement}
          prefillQuery={addressPrefill}
        />
      </View>

      <WizardDocumentFields
        title="Documents (optionnel)"
        subtitle="Carte Vitale, mutuelle…"
        fields={PERSONAL_DOC_FIELDS}
        files={personalFiles}
        onChange={(key, file) => setPersonalFiles((prev) => ({ ...prev, [key]: file }))}
      />

      {duplicate ? null : consentRow}
    </SheetModal>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    fields: { gap: spacing[3] },
    errorText: {
      ...font.medium,
      fontSize: fontSize.sm,
      color: c.error,
    },
    actionBtn: {
      minWidth: 0,
      flex: 1,
    },
  };
}
