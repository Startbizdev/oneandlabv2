import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useLocalSearchParams } from 'expo-router';
import { useBookingWizardHeader } from '../hooks/useBookingWizardHeader';
import { Plus } from 'lucide-react-native';
import { FormScreen } from '@/components/layout/FormScreen';
import { BookingActionBar } from '../components/BookingActionBar';
import { AddressAutocomplete } from '@/features/address/components/AddressAutocomplete';
import { useAuthStore } from '@/store/auth-store';
import { CareSelectionStep } from '../components/CareSelectionStep';
import { FormScheduleSection } from '../components/FormScheduleSection';
import { PreferredNurseGenderButtons } from '../components/PreferredNurseGenderButtons';
import { isNursingAppointment } from '@oneandlab/shared-utils';
import { FormPatientSection } from '../components/FormPatientSection';
import { FormDocumentsSection } from '../components/FormDocumentsSection';
import { WizardDocumentFields } from '../components/WizardDocumentFields';
import { WizardPatientDocumentsPanel } from '../components/WizardPatientDocumentsPanel';
import { PERSONAL_DOC_FIELDS } from '../constants/appointment-document-fields';
import { NEW_PATIENT_ID } from '../types';
import { BookingWizardProgress } from '../components/BookingWizardProgress';
import { BookingWizardSegmentContext } from '../components/BookingWizardSegmentContext';
import { BookingWizardPreviousRecaps } from '../components/BookingWizardPreviousRecaps';
import { RelativeQuickAddSheet } from '../components/RelativeQuickAddSheet';
import { useBookingWizard } from '../hooks/useBookingWizard';
import { buildAvailabilityPayload } from '../utils/availability';
import type { PatientRelative } from '@/features/patient-relatives/api/patient-relatives.service';
import { colors, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  mode: 'patient' | 'dashboard';
  role: string;
  basePath: string;
}

export function BookingWizardScreen({ mode, role, basePath }: Props) {
  const { patient_id: patientIdParam, relative_id: relativeIdParam } = useLocalSearchParams<{
    patient_id?: string;
    relative_id?: string;
  }>();
  const user = useAuthStore((s) => s.user);
  const [relativeSheetOpen, setRelativeSheetOpen] = useState(false);

  const bw = useBookingWizard({
    mode,
    role,
    basePath,
    initialPatientId: patientIdParam,
    initialRelativeId: relativeIdParam,
  });
  const w = bw.wizard;

  useBookingWizardHeader({
    step: bw.step,
    mode,
    role,
    wizardPageTitle: bw.wizardPageTitle,
    onWizardBack: bw.wizardPrev,
  });

  if (w.loading || (mode === 'patient' && bw.relativesLoading)) {
    return (
      <View style={styles.loadingWrap}>
        <Text style={styles.loadingText}>Chargement…</Text>
      </View>
    );
  }

  if (bw.step === 0) {
    return (
      <View style={styles.screen}>
        <CareSelectionStep
        nursingCategories={w.nursingCategories}
        bloodCategories={w.bloodCategories}
        allCategories={w.allCategories}
        selectedServices={w.selectedServices}
        formDataByService={w.formDataByService}
        onlyCategoryOptionsFor={w.onlyCategoryOptionsFor}
        onQuickAdd={w.quickAddService}
        onRemove={w.removeService}
        onContinue={bw.confirmStep0}
        loading={w.saving}
        />
      </View>
    );
  }

  const svc = bw.activeService;
  const svcId = svc?.id ?? '';
  const fd = (w.formDataByService[svcId] ?? {}) as Record<string, unknown>;
  const setFd = (patch: Record<string, unknown>) => {
    w.setFormDataByService((prev) => ({ ...prev, [svcId]: { ...prev[svcId], ...patch } }));
  };

  let avType: 'all_day' | 'custom' = 'all_day';
  let avRange: [number, number] = [8, 12];
  try {
    const a = JSON.parse(String(fd.availability ?? '{"type":"all_day"}')) as {
      type?: string;
      range?: number[];
    };
    if (a.type === 'custom' && a.range?.length === 2) {
      avType = 'custom';
      avRange = [a.range[0], a.range[1]];
    }
  } catch {
    /* default */
  }

  const skipRx = svc ? bw.careSkipsPrescription(svc.category_id) : false;
  const hideNurseGender = mode === 'dashboard' && role === 'nurse';
  const showNurseGenderOnSlot =
    bw.section === 'slot-datetime' &&
    svc &&
    isNursingAppointment(svc.type) &&
    !hideNurseGender;

  return (
    <View style={styles.screen}>
      <FormScreen
        contentContainerStyle={styles.formContent}
        backgroundColor={colors.background}
        footer={
          <BookingActionBar
            primaryLabel={bw.isFinalWizardStep ? 'Confirmer le rendez-vous' : 'Continuer'}
            onPrimary={bw.wizardNext}
            primaryLoading={bw.saving}
          />
        }
      >
        <BookingWizardProgress
          current={bw.wizardStepCurrent}
          total={bw.wizardStepCount}
          label={bw.section === 'slot-datetime' ? 'Créneau' : bw.section === 'documents' ? 'Documents' : 'Infos'}
        />

        {svc && bw.section === 'slot-datetime' ? (
          <BookingWizardSegmentContext
            currentLabel={svc.name}
            kind={bw.segmentKind}
            previousRecaps={bw.previousRecaps}
          />
        ) : null}

        {bw.section === 'documents' ? (
          <BookingWizardPreviousRecaps recaps={bw.previousRecaps} />
        ) : null}

        {bw.validationError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{bw.validationError}</Text>
          </View>
        ) : null}

        {bw.section === 'slot-datetime' && svc ? (
          <Animated.View entering={FadeInDown.delay(60).duration(260).springify()} style={styles.section}>
            <FormScheduleSection
              scheduledAt={String(fd.scheduled_at ?? '')}
              serviceType={svc.type}
              availabilityType={avType}
              range={avRange}
              onScheduledAt={(v) => setFd({ scheduled_at: v })}
              onAvailabilityType={(t) => setFd({ availability: buildAvailabilityPayload(t, avRange) })}
              onRange={(r) => setFd({ availability: buildAvailabilityPayload(avType, r) })}
            />
            {showNurseGenderOnSlot ? (
              <PreferredNurseGenderButtons
                value={String(fd.preferred_nurse_gender ?? 'any')}
                onChange={(v) => setFd({ preferred_nurse_gender: v })}
              />
            ) : null}
          </Animated.View>
        ) : null}

        {bw.section === 'documents' && svcId ? (
          <Animated.View entering={FadeInDown.delay(60).duration(260).springify()}>
            <FormDocumentsSection
              serviceName={svc?.name}
              serviceType={svc?.type}
              files={bw.filesByService[svcId] ?? {}}
              profileDocs={bw.profileDocs}
              profileDocsLoading={bw.profileDocsLoading}
              onPick={(key, file) => bw.setServiceFiles(svcId, key, file)}
              skipPrescription={skipRx}
              showProfileSummary={mode === 'patient'}
            />
          </Animated.View>
        ) : null}

        {bw.section === 'personal' ? (
          <Animated.View entering={FadeInDown.delay(60).duration(260).springify()} style={styles.section}>
            {mode === 'patient' ? (
              <>
                <Text style={styles.sectionLabel}>Pour qui est ce rendez-vous ?</Text>
                <View style={styles.relativeRow}>
                  <Pressable
                    onPress={() => bw.setSelectedRelativeId(null)}
                    style={[styles.relativePill, !bw.selectedRelativeId && styles.relativePillActive]}
                  >
                    <Text
                      style={[
                        styles.relativePillText,
                        !bw.selectedRelativeId && styles.relativePillTextActive,
                      ]}
                    >
                      Pour moi
                    </Text>
                  </Pressable>
                  {bw.relatives.map((r: PatientRelative) => {
                    const on = bw.selectedRelativeId === r.id;
                    const label = `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim() || r.id;
                    return (
                      <Pressable
                        key={r.id}
                        onPress={() => bw.setSelectedRelativeId(r.id)}
                        style={[styles.relativePill, on && styles.relativePillActive]}
                      >
                        <Text style={[styles.relativePillText, on && styles.relativePillTextActive]}>
                          {label}
                        </Text>
                      </Pressable>
                    );
                  })}
                  <Pressable
                    onPress={() => setRelativeSheetOpen(true)}
                    style={styles.addRelativeBtn}
                  >
                    <Plus size={14} color={colors.primary} strokeWidth={2.5} />
                    <Text style={styles.addRelativeText}>Proche</Text>
                  </Pressable>
                </View>
                {!bw.selectedRelativeId && user ? (
                  <View style={styles.selfCard}>
                    <Text style={styles.selfName}>
                      {user.first_name} {user.last_name}
                    </Text>
                    <Text style={styles.selfEmail}>{user.email}</Text>
                  </View>
                ) : null}
              </>
            ) : (
              <>
                <FormPatientSection
                  patients={w.patientOptions}
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
                  emailOptional={role === 'nurse' || role === 'pro'}
                />
                {bw.staffPatientUserId && (role === 'nurse' || role === 'pro') ? (
                  <WizardPatientDocumentsPanel
                    patientUserId={bw.staffPatientUserId}
                    documentsRoute={`${basePath}/patient/${bw.staffPatientUserId}/documents`}
                  />
                ) : w.patientMode === 'new' || w.selectedPatientId === NEW_PATIENT_ID ? (
                  <WizardDocumentFields
                    title="Documents du patient"
                    subtitle="Carte Vitale et mutuelle — enregistrés avec la fiche patient"
                    fields={PERSONAL_DOC_FIELDS}
                    files={bw.personalFiles}
                    onChange={bw.setPersonalFile}
                  />
                ) : null}
              </>
            )}

            {mode === 'patient' ? (
              <WizardDocumentFields
                title="Vos documents"
                subtitle={
                  bw.selectedRelativeId
                    ? 'Documents du proche enregistrés sur votre compte'
                    : 'Carte Vitale et mutuelle déjà enregistrées si présentes'
                }
                fields={PERSONAL_DOC_FIELDS}
                files={bw.personalFiles}
                profileDocs={bw.profileDocs}
                onChange={bw.setPersonalFile}
                loadingProfile={bw.profileDocsLoading}
              />
            ) : null}

            <AddressAutocomplete
              value={w.form.watch('address')}
              complement={w.addressComplement}
              onChange={w.onAddressChange}
              onComplementChange={w.onComplementChange}
            />

            {mode === 'patient' ? (
              <Pressable
                onPress={() => bw.setConsent(!bw.consent)}
                style={styles.consentRow}
              >
                <View style={[styles.checkbox, bw.consent && styles.checkboxActive]}>
                  {bw.consent ? <Text style={styles.checkmark}>✓</Text> : null}
                </View>
                <Text style={styles.consentText}>
                  J&apos;accepte la politique de confidentialité et le traitement de mes données de santé.
                </Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => bw.setConsent(!bw.consent)}
                style={styles.consentRow}
              >
                <View style={[styles.checkbox, bw.consent && styles.checkboxActive]}>
                  {bw.consent ? <Text style={styles.checkmark}>✓</Text> : null}
                </View>
                <Text style={styles.consentText}>
                  J&apos;accepte les conditions RGPD et le traitement des données de santé du patient.
                </Text>
              </Pressable>
            )}
          </Animated.View>
        ) : null}
      </FormScreen>

      <RelativeQuickAddSheet
        visible={relativeSheetOpen}
        onClose={() => setRelativeSheetOpen(false)}
        onCreated={(id) => bw.setSelectedRelativeId(id)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, minHeight: 0, backgroundColor: colors.background },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  formContent: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    gap: spacing[4],
  },
  section: { gap: spacing[4] },
  sectionLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
    color: colors.textPrimary,
  },
  errorBox: {
    backgroundColor: colors.errorLight,
    borderRadius: radius.lg,
    padding: spacing[3],
    borderWidth: 1,
    borderColor: colors.errorMid,
  },
  errorText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: colors.error,
    lineHeight: fontSize.sm * 1.45,
  },
  relativeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    alignItems: 'center',
  },
  relativePill: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  relativePillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  relativePillText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  relativePillTextActive: { color: colors.textInverse },
  addRelativeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.primaryMid,
    borderStyle: 'dashed',
  },
  addRelativeText: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: colors.primary,
  },
  selfCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    padding: spacing[3],
    gap: 2,
  },
  selfName: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
    color: colors.textPrimary,
  },
  selfEmail: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  checkboxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: {
    fontFamily: fontFamily.bold,
    fontSize: 12,
    color: colors.textInverse,
  },
  consentText: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: fontSize.sm * 1.55,
  },
});
