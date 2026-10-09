import { useAppColors } from '@/theme/use-app-colors';

import { useCallback, useRef, useState } from 'react';
import { View, type ScrollView } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useIsFocused } from '@react-navigation/native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { BookingWizardChrome } from '../components/BookingWizardChrome';
import { FormScreen } from '@/components/layout/FormScreen';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { ErrorState } from '@/components/ui/ErrorState';
import { LabBrandPreferenceStep } from '../components/LabBrandPreferenceStep';
import { BookingActionBar } from '../components/BookingActionBar';
import { bookingWizardFooterCtaCopy } from '../utils/booking-wizard-titles';
import { selectionRequiresFasting } from '../utils/booking-review-summary';
import { CareSelectionStep } from '../components/CareSelectionStep';
import { BookingSlotStep } from '../components/BookingSlotStep';
import { Button } from '@/components/ui/Button';
import { FormDocumentsSection } from '../components/FormDocumentsSection';
import { BookingWizardProgress } from '../components/BookingWizardProgress';
import { BookingWizardSegmentContext } from '../components/BookingWizardSegmentContext';
import { BookingPersonalStep } from '../components/BookingPersonalStep';
import { BookingReviewStep } from '../components/BookingReviewStep';
import { BookingSuccessView } from '../components/BookingSuccessView';
import { RelativeQuickAddSheet } from '../components/RelativeQuickAddSheet';
import { useBookingWizard } from '../hooks/useBookingWizard';
import { useBookingLeaveGuard } from '../hooks/use-booking-leave-guard';
import {
  useBookingDraftAutosave,
  useBookingDraftOwnerKey,
  useBookingDraftResume,
  useBookingDraftSession,
} from '../hooks/use-booking-draft';
import { BookingDraftResumeSheet } from '../components/BookingDraftResumeSheet';
import { DirectedProviderBanner } from '../components/DirectedProviderBanner';
import { useDirectedProviderName } from '../hooks/use-directed-provider-name';
import type { BookingDraftData } from '../utils/booking-draft';
import type { RoleRoutePrefix } from '@/navigation/role-route-prefix';
import { PATIENT_VIP_FEE_LABEL } from '@oneandlab/shared-constants';
import { resolveDirectedProvider, type DirectedProvider } from '@oneandlab/shared-utils';
import { SkeletonCareSelectionStep } from '@/components/ui/skeletons';
import { radius, spacing, AppText, useStyles, font, type Theme } from '@/theme';

interface Props {
  mode: 'patient' | 'dashboard';
  role: string;
  basePath: RoleRoutePrefix;
  /** Onglet Réserver patient — header d'onglet au lieu du header de pile. */
  embeddedInTab?: boolean;
}

/**
 * Une nouvelle session repart d'un assistant vierge (onglet Réserver après une demande envoyée),
 * ou du brouillon local que l'utilisateur choisit de reprendre.
 */
export function BookingWizardScreen(props: Props) {
  const [session, setSession] = useState(0);
  const [initialDraft, setInitialDraft] = useState<BookingDraftData | null>(null);
  const {
    patient_id: patientIdParam,
    relative_id: relativeIdParam,
    provider_id: providerIdParam,
  } = useLocalSearchParams<{
    patient_id?: string;
    relative_id?: string;
    provider_id?: string;
  }>();
  const focused = useIsFocused();
  const draftResume = useBookingDraftResume(
    useBookingDraftOwnerKey(),
    focused && !patientIdParam && !relativeIdParam && !providerIdParam,
  );
  const restart = useCallback(() => {
    setInitialDraft(null);
    setSession((s) => s + 1);
  }, []);
  const resumeDraft = () => {
    const data = draftResume.take();
    if (!data) return;
    setInitialDraft(data);
    setSession((s) => s + 1);
  };
  return (
    <>
      <BookingWizardFlow key={session} {...props} initialDraft={initialDraft} onRestart={restart} />
      <BookingDraftResumeSheet
        visible={draftResume.visible}
        onResume={resumeDraft}
        onRestart={draftResume.discard}
        onDismiss={draftResume.dismiss}
      />
    </>
  );
}

function BookingWizardFlow({
  mode,
  role,
  basePath,
  embeddedInTab = false,
  initialDraft,
  onRestart,
}: Props & { initialDraft: BookingDraftData | null; onRestart: () => void }) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const router = useRouter();
  const {
    patient_id: patientIdParam,
    relative_id: relativeIdParam,
    provider_id: providerIdParam,
    provider_role: providerRoleParam,
  } = useLocalSearchParams<{
    patient_id?: string;
    relative_id?: string;
    provider_id?: string;
    provider_role?: string;
  }>();
  const [directedProvider, setDirectedProvider] = useState<DirectedProvider | null>(() =>
    mode === 'patient'
      ? (resolveDirectedProvider(providerIdParam, providerRoleParam) ??
        resolveDirectedProvider(initialDraft?.directedProvider?.id, initialDraft?.directedProvider?.type))
      : null,
  );
  const draftSession = useBookingDraftSession(useBookingDraftOwnerKey());
  const [relativeSheetOpen, setRelativeSheetOpen] = useState(false);
  const formScrollRef = useRef<ScrollView>(null);

  const onConsentMissing = useCallback(() => {
    requestAnimationFrame(() => {
      formScrollRef.current?.scrollToEnd({ animated: true });
    });
  }, []);

  const bw = useBookingWizard({
    mode,
    role,
    basePath,
    initialPatientId: patientIdParam,
    initialRelativeId: relativeIdParam,
    onConsentMissing,
    initialDraft,
    onBookingCreated: draftSession.discard,
    directedProvider,
  });
  useBookingDraftAutosave(bw, draftSession);
  const providerName = useDirectedProviderName(bw.directedProvider);
  const w = bw.wizard;
  const { phases } = bw.progress;

  const leaveGuard = useBookingLeaveGuard({
    enabled: (bw.step > 0 || w.selectedServices.length > 0) && !bw.saving && !bw.created,
    canStepBack: bw.step > 0 && !bw.created,
    onStepBack: bw.wizardPrev,
    embeddedInTab,
  });

  const chromeProps = {
    step: bw.step,
    role,
    wizardPageTitle: bw.created ? 'Demande envoyée' : bw.wizardPageTitle,
    onWizardBack: bw.wizardPrev,
    embeddedInTab,
    hideBack: Boolean(bw.created),
  } as const;

  const leaveSheet = (
    <ConfirmSheet
      visible={leaveGuard.confirmVisible}
      title="Quitter la réservation ?"
      message="Votre saisie sera conservée 24 h sur cet appareil. Les documents joints devront être ajoutés à nouveau."
      confirmLabel="Quitter"
      cancelLabel="Continuer la réservation"
      tone="primary"
      onConfirm={leaveGuard.leave}
      onClose={leaveGuard.stay}
    />
  );

  const requiresFasting = selectionRequiresFasting(w.selectedServices, w.formDataByService);

  if (bw.created) {
    const ids = bw.created.appointmentIds;
    const singleId = !bw.created.fallbackList && ids.length === 1 ? ids[0] : null;
    const goTo = (href: Href) => {
      if (embeddedInTab) {
        router.push(href);
        onRestart();
      } else {
        router.replace(href);
      }
    };
    const goToList = () => goTo('/(patient)/(tabs)/appointments');
    return (
      <BookingWizardChrome {...chromeProps}>
        <View style={styles.screen}>
          <BookingSuccessView
            appointmentCount={Math.max(1, ids.length)}
            warning={bw.created.warning}
            requiresFasting={requiresFasting}
            primaryAction={
              singleId
                ? {
                    label: 'Voir mon rendez-vous',
                    onPress: () => goTo({ pathname: '/(patient)/appointment/[id]', params: { id: singleId } }),
                  }
                : { label: 'Voir mes rendez-vous', onPress: goToList }
            }
            secondaryAction={singleId ? { label: "Retour à l'accueil", onPress: goToList } : undefined}
          />
        </View>
      </BookingWizardChrome>
    );
  }

  if (w.loading) {
    return (
      <BookingWizardChrome {...chromeProps}>
        <View style={styles.screen}>
          <SkeletonCareSelectionStep />
        </View>
      </BookingWizardChrome>
    );
  }

  if (bw.step === 0) {
    return (
      <BookingWizardChrome {...chromeProps}>
        <View style={styles.screen}>
          {w.categoriesError && w.allCategories.length === 0 ? (
            <ErrorState
              error={w.categoriesError}
              title="Soins indisponibles"
              onRetry={w.retryCategories}
            />
          ) : (
            <CareSelectionStep
              nursingCategories={w.nursingCategories}
              bloodCategories={w.bloodCategories}
              allCategories={w.allCategories}
              selectedServices={w.selectedServices}
              onQuickAdd={w.quickAddService}
              onRemove={w.removeService}
              onContinue={bw.confirmStep0}
              onEnsureCategoryReady={w.ensureCategoryReady}
              formDataByService={w.formDataByService}
              loading={w.saving}
              phases={phases}
              contextBanner={
                bw.directedProvider && providerName ? (
                  <DirectedProviderBanner
                    name={providerName}
                    type={bw.directedProvider.type}
                    onRemove={() => setDirectedProvider(null)}
                  />
                ) : null
              }
            />
          )}
        </View>
        {leaveSheet}
      </BookingWizardChrome>
    );
  }

  if (bw.step === 1 && bw.needsLabPreferenceStep) {
    return (
      <BookingWizardChrome {...chromeProps}>
        <FormScreen
          contentContainerStyle={styles.formContent}
          backgroundColor={c.background}
          footer={
            <BookingActionBar
              title={bw.returnToReview ? 'Revenir au récapitulatif' : 'Continuer'}
              onPrimary={bw.confirmLabPreferenceStep}
            />
          }
        >
          <BookingWizardProgress
            current={bw.progress.current}
            total={phases.length}
            phases={phases}
            label={bw.progress.label}
          />
          <LabBrandPreferenceStep
            mode={bw.labPreferenceMode}
            brandId={bw.preferredLabBrandId}
            onModeChange={bw.setLabPreferenceMode}
            onBrandChange={bw.setPreferredLabBrandId}
            validationError={bw.validationError}
          />
        </FormScreen>
        {leaveSheet}
      </BookingWizardChrome>
    );
  }

  if (bw.step !== bw.formWizardStep) {
    return null;
  }

  const svc = bw.activeService;
  const svcId = svc?.id ?? '';
  const isReview = bw.section === 'review';
  const vipPriceLabel = bw.vipPaymentRequired ? (bw.vipPriceLabel ?? PATIENT_VIP_FEE_LABEL) : null;

  const consentError =
    bw.section === 'personal' &&
    !bw.consent &&
    Boolean(
      bw.validationError &&
        (bw.validationError.includes('RGPD') ||
          bw.validationError.includes('politique de confidentialité') ||
          bw.validationError.includes('confidentialité') ||
          bw.validationError.includes('consentement')),
    );

  const beneficiaryName = [w.form.watch('first_name'), w.form.watch('last_name')].filter(Boolean).join(' ');
  const beneficiaryDetail =
    mode === 'patient'
      ? bw.selectedRelativeId
        ? 'Rendez-vous pour un proche'
        : 'Pour vous'
      : String(w.form.watch('phone') || w.form.watch('email') || '');
  const addressLabel = String(w.form.watch('address') ?? '').trim();

  return (
    <BookingWizardChrome {...chromeProps}>
      <View style={styles.screen}>
        <FormScreen
          ref={formScrollRef}
          contentContainerStyle={styles.formContent}
          backgroundColor={c.background}
          footer={
            <BookingActionBar
              {...bookingWizardFooterCtaCopy({
                section: bw.section,
                mode,
                returnToReview: bw.returnToReview,
                vipPriceLabel,
              })}
              onPrimary={bw.wizardNext}
              primaryLoading={bw.saving}
              primaryDisabled={
                bw.saving ||
                (mode === 'dashboard' &&
                  isReview &&
                  w.patientMode === 'existing' &&
                  (w.patientProfileLoading || w.patientProfileError))
              }
            />
          }
        >
          <BookingWizardProgress
            current={bw.progress.current}
            total={phases.length}
            phases={phases}
            label={bw.progress.label}
            hint={bw.wizardProgressHint || undefined}
          />

          {svc && (bw.section === 'slot-datetime' || bw.section === 'documents') ? (
            <BookingWizardSegmentContext
              activeService={svc}
              lotServices={bw.activeLotServices}
              previousRecaps={bw.previousRecaps}
            />
          ) : null}

          {bw.profileDocsError && (bw.section === 'documents' || bw.section === 'personal') ? (
            <View style={styles.errorBox}>
              <AppText accessibilityRole="alert" style={styles.errorText}>Documents enregistrés indisponibles.</AppText>
              <Button title="Recharger les documents" variant="outline" onPress={bw.retryProfileDocs} />
            </View>
          ) : null}
          {bw.validationError && !consentError ? (
            <View style={styles.errorBox}>
              <AppText accessibilityRole="alert" style={styles.errorText}>{bw.validationError}</AppText>
            </View>
          ) : null}

          {bw.section === 'slot-datetime' && svc ? (
            <BookingSlotStep
              mode={mode}
              role={role}
              service={svc}
              formDataByService={w.formDataByService}
              setFormDataByService={w.setFormDataByService}
              vipFeeLabel={bw.vipPriceLabel ?? undefined}
            />
          ) : null}

          {bw.section === 'documents' && svcId ? (
            <Animated.View entering={FadeInDown.delay(60).duration(260).springify()}>
              <FormDocumentsSection
                serviceType={svc?.type}
                files={bw.filesByService[svcId] ?? {}}
                profileDocs={bw.profileDocs}
                profileDocsLoading={bw.profileDocsLoading}
                onPick={(key, file) => bw.setServiceFiles(svcId, key, file)}
                skipPrescription={svc ? bw.careSkipsPrescription(svc.category_id) : false}
                showProfileSummary={mode === 'patient'}
              />
            </Animated.View>
          ) : null}

          {bw.section === 'personal' ? (
            <Animated.View entering={FadeInDown.delay(60).duration(260).springify()} style={styles.section}>
              <BookingPersonalStep
                bw={bw}
                mode={mode}
                role={role}
                basePath={basePath}
                consentError={consentError}
                onAddRelative={() => setRelativeSheetOpen(true)}
                onConsentMissing={onConsentMissing}
              />
            </Animated.View>
          ) : null}

          {isReview ? (
            <Animated.View entering={FadeInDown.delay(60).duration(260).springify()}>
              <BookingReviewStep
                mode={mode}
                selectedServices={w.selectedServices}
                categories={bw.allCategories}
                formDataByService={w.formDataByService}
                slotRows={bw.slotRows}
                labSummary={bw.labSummary}
                providerName={providerName}
                beneficiary={{
                  name: beneficiaryName || (mode === 'patient' ? 'Vous' : 'Patient à renseigner'),
                  detail: beneficiaryDetail,
                }}
                address={addressLabel ? { label: addressLabel, complement: w.addressComplement } : null}
                vipPriceLabel={vipPriceLabel}
                requiresFasting={requiresFasting}
                onEditServices={bw.backToCareSelection}
                onEditLab={() => bw.editFromReview({ kind: 'lab' })}
                onEditSlot={(index) => bw.editFromReview({ kind: 'slot', index })}
                onEditPersonal={() => bw.editFromReview({ kind: 'personal' })}
              />
            </Animated.View>
          ) : null}
        </FormScreen>

        <RelativeQuickAddSheet
          visible={relativeSheetOpen}
          onClose={() => setRelativeSheetOpen(false)}
          patientId={mode === 'dashboard' ? w.selectedPatientId : undefined}
          staffConsent={mode === 'dashboard' ? bw.consent : undefined}
          onCreated={(id, created) => {
            bw.setSelectedRelativeId(id);
            if (created) void bw.applyRelativeToForm(id, created);
          }}
        />
      </View>
      {leaveSheet}
    </BookingWizardChrome>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    screen: { minWidth: 0, flex: 1, minHeight: 0, backgroundColor: c.background },
    formContent: {
      paddingHorizontal: spacing[4],
      paddingTop: spacing[4],
      gap: spacing[4],
    },
    section: { gap: spacing[4] },
    errorBox: {
      backgroundColor: c.errorLight,
      borderRadius: radius.lg,
      padding: spacing[3],
      gap: spacing[2],
      borderWidth: 1,
      borderColor: c.errorMid,
    },
    errorText: {
      ...font.medium,
      fontSize: fontSize.sm,
      color: c.error,
      lineHeight: fontSize.sm * 1.45,
    },
  };
}
