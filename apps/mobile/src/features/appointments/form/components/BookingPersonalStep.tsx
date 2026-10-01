import { View } from 'react-native';
import { BirthDatePicker } from '@/components/ui/BirthDatePicker';
import { AddressAutocomplete } from '@/features/address/components/AddressAutocomplete';
import { GenderSelect } from '@/features/auth/components/GenderSelect';
import { useAuthStore } from '@/store/auth-store';
import { normalizePatientGender } from '@/utils/patient-gender';
import { STAFF_PATIENT_BOOKING_CONSENT_LABEL } from '@oneandlab/shared-constants';
import { AppText, font, radius, spacing, useStyles, type Theme } from '@/theme';
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
  basePath: string;
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
  const w = bw.wizard;
  const toggleConsent = () => bw.setConsent(!bw.consent);

  return (
    <>
      {mode === 'patient' ? (
        <>
          <AppText style={styles.sectionLabel}>Pour qui est ce rendez-vous ?</AppText>
          <BookingRelativePills
            selfLabel="Pour moi"
            relatives={bw.relatives}
            selectedId={bw.selectedRelativeId}
            onSelect={bw.setSelectedRelativeId}
            addLabel="Proche"
            onAdd={onAddRelative}
          />
          {bw.selectedRelativeId ? (
            <View style={styles.selfCard}>
              <AppText style={styles.selfName}>
                {[w.form.watch('first_name'), w.form.watch('last_name')].filter(Boolean).join(' ') || 'Proche'}
              </AppText>
              <AppText style={styles.selfDetail}>Rendez-vous pour un proche</AppText>
            </View>
          ) : null}
          {!bw.selectedRelativeId && user ? (
            <View style={styles.selfCard}>
              <AppText style={styles.selfName}>
                {user.first_name} {user.last_name}
              </AppText>
              <AppText style={styles.selfDetail}>{user.email}</AppText>
            </View>
          ) : null}
          <View style={styles.identityBlock}>
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
            title="Vos documents"
            subtitle={
              bw.selectedRelativeId
                ? 'Documents du proche enregistrés sur votre compte'
                : 'Vitale, mutuelle et attestation déjà enregistrés si présents'
            }
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
            onAdoptLookupPatient={w.adoptLookupPatient}
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
              <AppText style={styles.sectionLabel}>Bénéficiaire du rendez-vous</AppText>
              <BookingRelativePills
                selfLabel="Titulaire"
                relatives={bw.relatives}
                selectedId={bw.selectedRelativeId}
                onSelect={bw.setSelectedRelativeId}
                addLabel="Nouveau proche"
                onAdd={() => {
                  if (!bw.consent) {
                    onConsentMissing();
                    return;
                  }
                  onAddRelative();
                }}
              />
            </>
          ) : null}
          {bw.staffPatientUserId && (role === 'nurse' || role === 'pro') ? (
            <WizardPatientDocumentsPanel
              patientUserId={bw.staffPatientUserId}
              documentsRoute={`${basePath}/patient/${bw.staffPatientUserId}/documents`}
            />
          ) : w.patientMode === 'new' || w.selectedPatientId === NEW_PATIENT_ID ? (
            <WizardDocumentFields
              title="Documents du patient"
              subtitle="Vitale, mutuelle et attestation — enregistrés avec la fiche patient"
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

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    sectionLabel: {
      ...font.semiBold,
      fontSize: fontSize.base,
      color: c.textPrimary,
    },
    selfCard: {
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      padding: spacing[3],
      gap: spacing[0.5],
    },
    selfName: {
      ...font.semiBold,
      fontSize: fontSize.base,
      color: c.textPrimary,
    },
    selfDetail: {
      ...font.regular,
      fontSize: fontSize.sm,
      color: c.textSecondary,
    },
    identityBlock: { gap: spacing[3] },
    consentBlock: { gap: spacing[1] },
  };
}
