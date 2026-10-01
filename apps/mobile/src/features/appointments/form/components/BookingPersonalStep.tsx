import { View } from 'react-native';
import { BirthDatePicker } from '@/components/ui/BirthDatePicker';
import { AddressAutocomplete } from '@/features/address/components/AddressAutocomplete';
import { GenderSelect } from '@/features/auth/components/GenderSelect';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/providers/ToastProvider';
import { normalizePatientGender } from '@/utils/patient-gender';
import { STAFF_PATIENT_BOOKING_CONSENT_LABEL } from '@oneandlab/shared-constants';
import { AppText, spacing, useStyles } from '@/theme';
import { staffPatientHref } from '@/navigation/role-hrefs';
import type { RoleRoutePrefix } from '@/navigation/role-route-prefix';
import type { useBookingWizard } from '../hooks/useBookingWizard';
import { isPatientEmailOptionalForBookingRole } from '../utils/booking-wizard-role-rules';
import { PERSONAL_DOC_FIELDS } from '../constants/appointment-document-fields';
import { NEW_PATIENT_ID } from '../types';
import { BookingConsentRow } from './BookingConsentRow';
import { BookingLegalLinks } from './BookingLegalLinks';
import { BookingRelativePills } from './BookingRelativePills';
import { FormPatientSection } from './FormPatientSection';
import { ProNurseAssignmentSection } from './ProNurseAssignmentSection';
import { WizardDocumentFields } from './WizardDocumentFields';
import { WizardPatientDocumentsPanel } from './WizardPatientDocumentsPanel';

const PATIENT_CONSENT_LABEL =
  "J'accepte la politique de confidentialité et consens au traitement de mes données de santé. " +
  "J'autorise Cary à partager les informations de mon profil et les éléments nécessaires à la prise de " +
  'rendez-vous avec les professionnels de santé de mon secteur.';
const PRIVACY_SLUGS = ['confidentialite'] as const;

interface Props {
  bw: ReturnType<typeof useBookingWizard>;
  mode: 'patient' | 'dashboard';
  role: string;
  basePath: RoleRoutePrefix;
  consentError: boolean;
  onAddRelative: () => void;
  onConsentMissing: () => void;
}

/** Étape « Vos infos » / « Patient » : bénéficiaire, documents, adresse, consentement. */
export function BookingPersonalStep({
  bw,
  mode,
  role,
  basePath,
  consentError,
  onAddRelative,
  onConsentMissing,
}: Props) {
  const styles = useStyles(buildStyles);
  const user = useAuthStore((s) => s.user);
  const { show: toast } = useToast();
  const w = bw.wizard;
  const staffPrefix = basePath === '/(nurse)' || basePath === '/(pro)' ? basePath : null;
  const toggleConsent = () => bw.setConsent(!bw.consent);

  return (
    <>
      {mode === 'patient' ? (
        <>
          <View style={styles.block}>
            <AppText variant="headline" accessibilityRole="header">Pour qui est ce rendez-vous ?</AppText>
            <BookingRelativePills
              selfLabel={user?.first_name ? `Moi, ${user.first_name}` : 'Pour moi'}
              relatives={bw.relatives}
              selectedId={bw.selectedRelativeId}
              onSelect={bw.setSelectedRelativeId}
              addLabel="Ajouter un proche"
              onAdd={onAddRelative}
            />
          </View>
          <View style={styles.block}>
            <GenderSelect
              label="Genre"
              value={normalizePatientGender(w.form.watch('gender'))}
              onChange={(v) => w.form.setValue('gender', v)}
            />
            <BirthDatePicker
              value={w.form.watch('birth_date')}
              onChange={(v) => w.form.setValue('birth_date', v)}
            />
          </View>
          <WizardDocumentFields
            title={bw.selectedRelativeId ? 'Cartes du proche' : 'Vos cartes'}
            subtitle="Facultatif. Celles de votre dossier sont reprises."
            fields={PERSONAL_DOC_FIELDS}
            files={bw.personalFiles}
            profileDocs={bw.profileDocs}
            onChange={bw.setPersonalFile}
            loadingProfile={bw.profileDocsLoading}
          />
        </>
      ) : (
        <>
          <FormPatientSection
            patients={w.patientOptions}
            patientsLoading={w.patientsLoading}
            patientsError={w.patientsError}
            retryPatients={w.retryPatients}
            patientProfileLoading={w.patientProfileLoading}
            patientProfileError={w.patientProfileError}
            retryPatientProfile={w.retryPatientProfile}
            patientMode={w.patientMode}
            onPatientModeChange={w.setPatientMode}
            selectedPatientId={w.selectedPatientId}
            onSelectPatient={w.onSelectPatient}
            onAdoptLookupPatient={async (match) => {
              if (!bw.consent) {
                toast('Confirmez d’abord le consentement du patient pour utiliser ce dossier.', { type: 'error' });
                onConsentMissing();
                return false;
              }
              return w.adoptLookupPatient(match);
            }}
            firstName={w.form.watch('first_name')}
            lastName={w.form.watch('last_name')}
            email={w.form.watch('email')}
            phone={w.form.watch('phone')}
            gender={w.form.watch('gender')}
            birthDate={w.form.watch('birth_date')}
            onChange={(field, value) => w.form.setValue(field as 'first_name', value)}
            emailOptional={isPatientEmailOptionalForBookingRole(role)}
          />
          {w.patientMode === 'existing' && w.selectedPatientId ? (
            <>
              <AppText variant="headline" accessibilityRole="header">Bénéficiaire du rendez-vous</AppText>
              <BookingRelativePills
                selfLabel="Titulaire"
                relatives={bw.relatives}
                selectedId={bw.selectedRelativeId}
                onSelect={bw.setSelectedRelativeId}
                addLabel="Nouveau proche"
                onAdd={() => {
                  if (!bw.consent) {
                    toast('Confirmez d’abord le consentement du patient.', { type: 'error' });
                    onConsentMissing();
                    return;
                  }
                  onAddRelative();
                }}
              />
            </>
          ) : null}
          {bw.staffPatientUserId && staffPrefix ? (
            <WizardPatientDocumentsPanel
              patientUserId={bw.staffPatientUserId}
              documentsHref={staffPatientHref(staffPrefix, bw.staffPatientUserId, 'documents')}
            />
          ) : w.patientMode === 'new' || w.selectedPatientId === NEW_PATIENT_ID ? (
            <WizardDocumentFields
              title="Cartes du patient"
              subtitle="Facultatif. Enregistrées avec la fiche patient."
              fields={PERSONAL_DOC_FIELDS}
              files={bw.personalFiles}
              onChange={bw.setPersonalFile}
            />
          ) : null}
        </>
      )}

      <AddressAutocomplete
        value={w.form.watch('address')}
        complement={w.addressComplement}
        onChange={w.onAddressChange}
        onComplementChange={w.onComplementChange}
      />

      {bw.showProNurseAssignment ? (
        <ProNurseAssignmentSection
          mode={bw.nurseAssignmentMode}
          onModeChange={bw.setNurseAssignmentMode}
          linkedNurses={bw.linkedNurses}
          linkedNursesLoading={bw.linkedNursesLoading}
          selectedLinkedNurseId={bw.proLinkedNurseId}
          onSelectLinkedNurse={bw.onSelectLinkedNurse}
          externalPhone={bw.externalNursePhone}
          onExternalPhoneChange={bw.onExternalNursePhoneChange}
        />
      ) : null}

      {mode === 'patient' ? (
        <View style={styles.consentBlock}>
          <BookingConsentRow
            checked={bw.consent}
            onToggle={toggleConsent}
            label={PATIENT_CONSENT_LABEL}
            error={consentError}
          />
          <BookingLegalLinks slugs={PRIVACY_SLUGS} />
        </View>
      ) : (
        <BookingConsentRow
          checked={bw.consent}
          onToggle={toggleConsent}
          label={STAFF_PATIENT_BOOKING_CONSENT_LABEL}
          error={consentError}
        />
      )}
    </>
  );
}

function buildStyles() {
  return {
    block: { gap: spacing[3] },
    consentBlock: { gap: spacing[1] },
  };
}
