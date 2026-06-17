import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';

import { useCallback, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View, type ScrollView } from 'react-native';
import { Row } from '@/components/layout/primitives';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useLocalSearchParams } from 'expo-router';
import { BookingWizardChrome } from '../components/BookingWizardChrome';
import { Plus } from 'lucide-react-native';
import { BirthDatePicker } from '@/components/ui/BirthDatePicker';
import { FormScreen } from '@/components/layout/FormScreen';
import { BookingActionBar } from '../components/BookingActionBar';
import { bookingWizardFooterCtaCopy } from '../utils/booking-wizard-titles';
import { AddressAutocomplete } from '@/features/address/components/AddressAutocomplete';
import { useAuthStore } from '@/store/auth-store';
import { CareSelectionStep } from '../components/CareSelectionStep';
import { FormScheduleSection } from '../components/FormScheduleSection';
import { PreferredNurseGenderButtons } from '../components/PreferredNurseGenderButtons';
import { isBloodTestAppointment, isNursingAppointment } from '@oneandlab/shared-utils';
import { FormPatientSection } from '../components/FormPatientSection';
import { FormDocumentsSection } from '../components/FormDocumentsSection';
import { WizardDocumentFields } from '../components/WizardDocumentFields';
import { WizardPatientDocumentsPanel } from '../components/WizardPatientDocumentsPanel';
import { PERSONAL_DOC_FIELDS } from '../constants/appointment-document-fields';
import { GenderSelect } from '@/features/auth/components/GenderSelect';
import { normalizePatientGender } from '@/utils/patient-gender';
import { BookingWizardProgress } from '../components/BookingWizardProgress';
import { BookingWizardSegmentContext } from '../components/BookingWizardSegmentContext';
import { RelativeQuickAddSheet } from '../components/RelativeQuickAddSheet';
import { useBookingWizard } from '../hooks/useBookingWizard';
import { NEW_PATIENT_ID } from '../types';
import { buildAvailabilityFormPatch, parseAvailabilityField, type AvailabilityType, type UrgentTimingMode } from '../utils/availability';
import type { PatientRelative } from '@/features/patient-relatives/api/patient-relatives.service';
import { SkeletonCareSelectionStep } from '@/components/ui/skeletons';
import { useStackScrollConfig } from '@/navigation/use-stack-scroll-config';
import { spreadTabSceneScrollProps } from '@/components/navigation/liquid-glass-header-inset';
import { radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  mode: 'patient' | 'dashboard';
  role: string;
  basePath: string;
  /** Onglet Réserver patient — header glass onglet au lieu du stack natif. */
  embeddedInTab?: boolean;
}

export function BookingWizardScreen({
  mode, role, basePath, embeddedInTab = false }: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'features_appointments_form_screens_BookingWizardScreen_tsx_styles');
  const { patient_id: patientIdParam, relative_id: relativeIdParam } = useLocalSearchParams<{
    patient_id?: string;
    relative_id?: string;
  }>();
  const user = useAuthStore((s) => s.user);
  const [relativeSheetOpen, setRelativeSheetOpen] = useState(false);
  const formScrollRef = useRef<ScrollView>(null);

  const onConsentMissing = useCallback(() => {
    requestAnimationFrame(() => {
      formScrollRef.current?.scrollToEnd({ animated: true });
    });
    Alert.alert(
      'Consentement requis',
      mode === 'patient'
        ? 'Veuillez accepter la politique de confidentialité avant de confirmer votre rendez-vous.'
        : 'Veuillez accepter les conditions RGPD avant de confirmer le rendez-vous.',
      [{ text: 'OK' }],
    );
  }, [mode]);

  const bw = useBookingWizard({
    mode,
    role,
    basePath,
    initialPatientId: patientIdParam,
    initialRelativeId: relativeIdParam,
    onConsentMissing,
  });
  const w = bw.wizard;
  const scrollConfig = useStackScrollConfig(styles.formContent);

  const chromeProps = {
    step: bw.step,
    role,
    wizardPageTitle: bw.wizardPageTitle,
    onWizardBack: bw.wizardPrev,
    embeddedInTab,
  } as const;

  if (w.loading) {
    return (
      <BookingWizardChrome {...chromeProps}>
        <View style={styles.screenCare}>
          <SkeletonCareSelectionStep />
        </View>
      </BookingWizardChrome>
    );
  }

  if (bw.step === 0) {
    return (
      <BookingWizardChrome {...chromeProps}>
        <View style={styles.screenCare}>
          <CareSelectionStep
            nursingCategories={w.nursingCategories}
            bloodCategories={w.bloodCategories}
            allCategories={w.allCategories}
            selectedServices={w.selectedServices}
            onlyCategoryOptionsFor={w.onlyCategoryOptionsFor}
            onQuickAdd={w.quickAddService}
            onRemove={w.removeService}
            onContinue={bw.confirmStep0}
            onEnsureCategoryReady={w.ensureCategoryReady}
            formDataByService={w.formDataByService}
            loading={w.saving}
            progressTotal={Math.max(3, bw.wizardStepCount)}
          />
        </View>
      </BookingWizardChrome>
    );
  }

  const svc = bw.activeService;
  const svcId = svc?.id ?? '';
  const fd = (w.formDataByService[svcId] ?? {}) as Record<string, unknown>;
  const availability = parseAvailabilityField(fd.availability, {
    availability_type: fd.availability_type,
    availabilityRange: fd.availabilityRange,
    urgentHour: fd.urgentHour,
    urgentMinute: fd.urgentMinute,
    urgentTimingMode: fd.urgentTimingMode,
  });
  const setFd = (patch: Record<string, unknown>) => {
    w.setFormDataByService((prev) => ({ ...prev, [svcId]: { ...prev[svcId], ...patch } }));
  };
  const patchVipSchedule = (patch: {
    type?: AvailabilityType;
    range?: [number, number];
    mode?: UrgentTimingMode;
    hour?: number;
    minute?: number;
  }) => {
    w.setFormDataByService((prev) => {
      const slice = { ...(prev[svcId] ?? {}) };
      const parsed = parseAvailabilityField(slice.availability, {
        availability_type: slice.availability_type,
        availabilityRange: slice.availabilityRange,
        urgentHour: slice.urgentHour,
        urgentMinute: slice.urgentMinute,
        urgentTimingMode: slice.urgentTimingMode,
      });
      const type = patch.type ?? parsed.type;
      const range = patch.range ?? parsed.range;
      const mode = patch.mode ?? parsed.urgentTimingMode;
      const hour = patch.hour ?? parsed.urgentHour;
      const minute = patch.minute ?? parsed.urgentMinute;
      return {
        ...prev,
        [svcId]: {
          ...slice,
          ...buildAvailabilityFormPatch(
            type,
            range,
            type === 'urgent' ? { mode, hour, minute } : undefined,
          ),
        },
      };
    });
  };
  const showVipTab = mode === 'patient' && svc ? isBloodTestAppointment(svc.type) : false;

  const skipRx = svc ? bw.careSkipsPrescription(svc.category_id) : false;
  const hideNurseGender = mode === 'dashboard' && role === 'nurse';
  const showNurseGenderOnSlot =
    bw.section === 'slot-datetime' &&
    svc &&
    isNursingAppointment(svc.type) &&
    !hideNurseGender;

  const consentError =
    bw.section === 'personal' &&
    !bw.consent &&
    Boolean(
      bw.validationError &&
        (bw.validationError.includes('RGPD') ||
          bw.validationError.includes('politique de confidentialité') ||
          bw.validationError.includes('confidentialité')),
    );

  return (
    <BookingWizardChrome {...chromeProps}>
      <View style={styles.screenWizard}>
        <FormScreen
          ref={formScrollRef}
          contentContainerStyle={scrollConfig.contentContainerStyle}
          {...spreadTabSceneScrollProps(scrollConfig)}
          backgroundColor={c.bookingCanvasLight}
        footer={
          <BookingActionBar
            {...bookingWizardFooterCtaCopy(bw.isFinalWizardStep)}
            onPrimary={bw.wizardNext}
            primaryLoading={bw.saving}
          />
        }
      >
        <BookingWizardProgress
          current={bw.wizardStepCurrent}
          total={bw.wizardStepCount}
          label={bw.section === 'slot-datetime' ? 'Créneau' : bw.section === 'documents' ? 'Documents' : 'Infos'}
          hint={bw.wizardProgressHint || undefined}
        />

        {svc && (bw.section === 'slot-datetime' || bw.section === 'documents') ? (
          <BookingWizardSegmentContext
            activeService={svc}
            lotServices={bw.activeLotServices}
            previousRecaps={bw.previousRecaps}
          />
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
              availabilityType={availability.type}
              range={availability.range}
              showVipTab={showVipTab}
              urgentHour={availability.urgentHour}
              urgentMinute={availability.urgentMinute}
              urgentTimingMode={availability.urgentTimingMode}
              onScheduledAt={(v) => setFd({ scheduled_at: v })}
              onAvailabilityType={(t) =>
                patchVipSchedule({
                  type: t,
                  range: availability.range,
                  mode: availability.urgentTimingMode,
                  hour: availability.urgentHour,
                  minute: availability.urgentMinute,
                })
              }
              onRange={(r) =>
                patchVipSchedule({
                  type: availability.type,
                  range: r,
                  mode: availability.urgentTimingMode,
                  hour: availability.urgentHour,
                  minute: availability.urgentMinute,
                })
              }
              onUrgentHour={(h) => patchVipSchedule({ type: 'urgent', hour: h })}
              onUrgentMinute={(m) => patchVipSchedule({ type: 'urgent', minute: m })}
              onUrgentTimingMode={(m) => patchVipSchedule({ type: 'urgent', mode: m })}
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
                <Row wrap gap={spacing[2]} align="center">
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
                    <Row gap={4} align="center">
                      <Plus size={14} color={c.primary} strokeWidth={2.5} />
                      <Text style={styles.addRelativeText}>Proche</Text>
                    </Row>
                  </Pressable>
                </Row>
                {bw.selectedRelativeId ? (
                  <View style={styles.selfCard}>
                    <Text style={styles.selfName}>
                      {[w.form.watch('first_name'), w.form.watch('last_name')].filter(Boolean).join(' ') ||
                        'Proche'}
                    </Text>
                    <Text style={styles.selfEmail}>Rendez-vous pour un proche</Text>
                  </View>
                ) : null}
                {!bw.selectedRelativeId && user ? (
                  <View style={styles.selfCard}>
                    <Text style={styles.selfName}>
                      {user.first_name} {user.last_name}
                    </Text>
                    <Text style={styles.selfEmail}>{user.email}</Text>
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
                style={[styles.consentRow, consentError && styles.consentRowError]}
              >
                <Row align="start" gap={spacing[3]}>
                  <View style={[styles.checkbox, bw.consent && styles.checkboxActive]}>
                    {bw.consent ? <Text style={styles.checkmark}>✓</Text> : null}
                  </View>
                  <Text style={styles.consentText}>
                    J&apos;accepte la politique de confidentialité et consens au traitement de mes données de
                    santé. J&apos;autorise Cary à partager les informations de mon profil et les éléments
                    nécessaires à la prise de rendez-vous avec les professionnels de santé de mon secteur.
                  </Text>
                </Row>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => bw.setConsent(!bw.consent)}
                style={[styles.consentRow, consentError && styles.consentRowError]}
              >
                <Row align="start" gap={spacing[3]}>
                  <View style={[styles.checkbox, bw.consent && styles.checkboxActive]}>
                    {bw.consent ? <Text style={styles.checkmark}>✓</Text> : null}
                  </View>
                  <Text style={styles.consentText}>
                    J&apos;accepte les conditions RGPD et consens au traitement des données de santé du
                    patient. J&apos;autorise Cary à communiquer les informations du profil et les éléments
                    nécessaires aux professionnels de santé concernés par ce rendez-vous.
                  </Text>
                </Row>
              </Pressable>
            )}
          </Animated.View>
        ) : null}
      </FormScreen>

      <RelativeQuickAddSheet
        visible={relativeSheetOpen}
        onClose={() => setRelativeSheetOpen(false)}
        onCreated={(id, created) => {
          bw.setSelectedRelativeId(id);
          if (created) void bw.applyRelativeToForm(id, created);
        }}
      />
      </View>
    </BookingWizardChrome>
  );
}

function buildStyles(c: AppColors) {
  return {
  screenWizard: { minWidth: 0, flex: 1, minHeight: 0, backgroundColor: c.bookingCanvasLight },
  screenCare: { minWidth: 0, flex: 1, minHeight: 0, backgroundColor: c.bookingCanvas },
  formContent: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    gap: spacing[4],
  },
  section: { gap: spacing[4] },
  sectionLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
    color: c.textPrimary,
  },
  errorBox: {
    backgroundColor: c.errorLight,
    borderRadius: radius.lg,
    padding: spacing[3],
    borderWidth: 1,
    borderColor: c.errorMid,
  },
  errorText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: c.error,
    lineHeight: fontSize.sm * 1.45,
  },
  relativePill: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
  },
  relativePillActive: {
    backgroundColor: c.primary,
    borderColor: c.primary,
  },
  relativePillText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: c.textSecondary,
  },
  relativePillTextActive: { color: c.textInverse },
  addRelativeBtn: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: c.primaryMid,
    borderStyle: 'dashed' as const,
  },
  addRelativeText: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: c.primary,
  },
  selfCard: {
    backgroundColor: c.surfaceAlt,
    borderRadius: radius.lg,
    padding: spacing[3],
    gap: 2,
  },
  selfName: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
    color: c.textPrimary,
  },
  selfEmail: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: c.textSecondary,
  },
  identityBlock: { gap: spacing[3] },
  fieldLabel: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: c.textSecondary,
  },
  genderRow: { gap: spacing[2] },
  genderPills: { minWidth: 0 },
  genderPill: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
  },
  genderPillActive: {
    backgroundColor: c.primary,
    borderColor: c.primary,
  },
  genderPillText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: c.textSecondary,
  },
  genderPillTextActive: { color: c.textInverse },
  consentRow: {
    padding: spacing[3],
    marginHorizontal: -spacing[3],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  consentRowError: {
    borderColor: c.errorMid,
    backgroundColor: c.errorLight,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: c.border,
    backgroundColor: c.surface,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginTop: 1,
    flexShrink: 0,
  },
  checkboxActive: {
    backgroundColor: c.primary,
    borderColor: c.primary,
  },
  checkmark: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xs,
    color: c.textInverse,
  },
  consentText: {
    minWidth: 0,
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: c.textSecondary,
    lineHeight: fontSize.sm * 1.55,
  },
};
}

