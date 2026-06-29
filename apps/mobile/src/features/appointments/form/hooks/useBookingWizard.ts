import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CACHE_STALE_RELATIVES_MS } from '@oneandlab/shared-constants';
import { useRouter } from 'expo-router';
import {
  buildDashboardAppointmentPayloads,
  servicesRequiringOwnSlots,
  validateUnifiedRdvPayload,
  type SelectedServiceInput,
} from '@oneandlab/shared-utils';
import { queryKeys } from '@/lib/query-keys';
import { useToast } from '@/providers/ToastProvider';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { createMultipleAppointments } from '@/features/appointments/api/create-multiple-appointments';
import {
  createPatientBookingDraft,
} from '@/features/appointments/api/booking-draft.service';
import { buildPatientBookingDraftFormData } from '../utils/build-booking-draft-form-data';
import {
  enrichFormDataByServiceForVip,
  patientBookingNeedsVipPayment,
} from '../utils/patient-vip-booking';
import { usePatientVipIap } from './use-patient-vip-iap';
import { randomUUID } from '@/lib/uuid';
import { useAuthStore } from '@/store/auth-store';
import { fetchPatientRelatives, fetchPatientRelative, type PatientRelative } from '@/features/patient-relatives/api/patient-relatives.service';
import { normalizePatientGender } from '@/utils/patient-gender';
import { normalizeCategorySkipPrescriptionDocuments } from '@/utils/category-skip-prescription-documents';
import { validateBookingWizardSubstep } from '../utils/validate-booking-wizard-substep';
import { servicesInActiveLot } from '../utils/booking-wizard-lot';
import { bookingWizardProgressHint } from '../utils/booking-wizard-progress-label';
import { recapDateLabel, type WizardRecapItem } from '../components/BookingWizardSegmentContext';
import { bookingWizardServiceDisplayName } from '../utils/booking-wizard-lot';
import type { LocalFileRef } from '../types';
import type { DocumentFileRef } from '../types/document-file-ref';
import { profileDocRefFromRow } from '../types/document-file-ref';
import { mergePersonalFilesIntoFormData } from '../utils/merge-wizard-files';
import { PROFILE_PREFILL_DOC_KEYS } from '../constants/appointment-document-fields';
import { useWizardProfileDocuments } from './useWizardProfileDocuments';
import { fetchUser } from '@/features/profile/api/profile.service';
import { useMultiAppointmentWizard } from './useAppointmentForm';
import { NEW_PATIENT_ID } from '../types';

export type BookingWizardSection = 'slot-datetime' | 'documents' | 'personal';

export function useBookingWizard(opts: {
  mode: 'patient' | 'dashboard';
  role: string;
  basePath: string;
  initialPatientId?: string;
  initialRelativeId?: string;
  onConsentMissing?: () => void;
}) {
  const { show: toast } = useToast();
  const router = useRouter();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const patientVipIap = usePatientVipIap();

  const [step, setStep] = useState(0);
  const [wizardIndex, setWizardIndex] = useState(0);
  const [consent, setConsent] = useState(false);
  const consentRef = useRef(false);
  useEffect(() => {
    consentRef.current = consent;
  }, [consent]);
  const [selectedRelativeId, setSelectedRelativeId] = useState<string | null>(
    opts.initialRelativeId ?? null,
  );
  const [validationError, setValidationError] = useState('');
  const [filesByService, setFilesByService] = useState<
    Record<string, Record<string, DocumentFileRef | undefined>>
  >({});
  const [personalFiles, setPersonalFiles] = useState<
    Record<string, DocumentFileRef | undefined>
  >({});

  const wizard = useMultiAppointmentWizard({
    role: opts.role,
    basePath: opts.basePath,
    initialPatientId: opts.initialPatientId,
    syncPatientSelfAddress: opts.mode === 'patient',
    bookingMode: opts.mode,
    getPatientBookingConsent:
      opts.mode === 'dashboard' ? () => consentRef.current : undefined,
  });

  const patientProfileQ = useQuery({
    queryKey: queryKeys.profile.user(user?.id ?? ''),
    queryFn: async () => {
      const res = await fetchUser(user!.id, 'mobile');
      if (!res.success) throw new Error(res.error ?? 'Profil introuvable');
      return res.data;
    },
    enabled: opts.mode === 'patient' && Boolean(user?.id) && !selectedRelativeId,
    staleTime: 60_000,
  });

  const relativesQ = useQuery({
    queryKey: ['patient-relatives'],
    queryFn: async () => {
      const res = await fetchPatientRelatives();
      if (!res.success) throw new Error(res.error);
      return res.data ?? [];
    },
    enabled: opts.mode === 'patient',
    staleTime: CACHE_STALE_RELATIVES_MS,
  });

  const applyRelativeToForm = useCallback(
    async (relativeId: string, cached?: PatientRelative | null) => {
      let rel = cached ?? relativesQ.data?.find((r) => r.id === relativeId) ?? null;
      if (!rel || !normalizePatientGender(rel.gender) || !rel.birth_date?.trim()) {
        try {
          const res = await fetchPatientRelative(relativeId);
          if (res.success && res.data) rel = res.data;
        } catch {
          /* liste locale */
        }
      }
      if (!rel) return;
      wizard.form.setValue('first_name', rel.first_name ?? '');
      wizard.form.setValue('last_name', rel.last_name ?? '');
      wizard.form.setValue('gender', normalizePatientGender(rel.gender));
      wizard.form.setValue('birth_date', rel.birth_date ?? '');
      if (rel.phone) wizard.form.setValue('phone', rel.phone);
      if (rel.email) wizard.form.setValue('email', rel.email);
      if (rel.address) {
        await wizard.onAddressChange({
          label: rel.address.label,
          lat: rel.address.lat,
          lng: rel.address.lng,
          city: rel.address.city,
          postal_code: rel.address.postal_code,
        });
        if (rel.address.complement) wizard.setAddressComplement(String(rel.address.complement));
      }
    },
    [relativesQ.data, wizard],
  );

  const selectRelative = useCallback(
    (relativeId: string | null) => {
      setSelectedRelativeId(relativeId);
      if (relativeId) void applyRelativeToForm(relativeId);
    },
    [applyRelativeToForm],
  );

  useEffect(() => {
    if (opts.mode !== 'patient') return;
    if (selectedRelativeId) {
      void applyRelativeToForm(selectedRelativeId);
      return;
    }
    if (!user) return;
    wizard.form.setValue('first_name', user.first_name ?? '');
    wizard.form.setValue('last_name', user.last_name ?? '');
    wizard.form.setValue('email', user.email ?? '');
    wizard.form.setValue('phone', (user as { phone?: string }).phone ?? '');
    const row = patientProfileQ.data as { gender?: string; birth_date?: string } | undefined;
    if (row?.gender) wizard.form.setValue('gender', normalizePatientGender(row.gender));
    if (row?.birth_date) wizard.form.setValue('birth_date', row.birth_date);
  }, [opts.mode, selectedRelativeId, applyRelativeToForm, user, patientProfileQ.data, wizard.form]);

  const allCategories = useMemo(
    () => [...wizard.nursingCategories, ...wizard.bloodCategories],
    [wizard.nursingCategories, wizard.bloodCategories],
  );

  const slotRows = useMemo(
    () => servicesRequiringOwnSlots(wizard.selectedServices),
    [wizard.selectedServices],
  );

  const careSkipsPrescription = useCallback(
    (categoryId: string | null | undefined) => {
      if (!categoryId) return false;
      const svc = wizard.selectedServices.find((s) => String(s.category_id) === String(categoryId));
      if (svc && normalizeCategorySkipPrescriptionDocuments(svc.skip_prescription_documents)) {
        return true;
      }
      const cat = allCategories.find((c) => String(c.id) === String(categoryId));
      return normalizeCategorySkipPrescriptionDocuments(
        (cat as { skip_prescription_documents?: unknown } | undefined)?.skip_prescription_documents,
      );
    },
    [wizard.selectedServices, allCategories],
  );

  const documentsSlotRows = useMemo(
    () => slotRows.filter((svc) => !careSkipsPrescription(svc.category_id)),
    [slotRows, careSkipsPrescription],
  );

  const staffPatientUserId = useMemo(() => {
    if (opts.mode !== 'dashboard') return null;
    if (wizard.patientMode !== 'existing') return null;
    const id = wizard.selectedPatientId;
    if (!id || id === NEW_PATIENT_ID) return null;
    return id;
  }, [opts.mode, wizard.patientMode, wizard.selectedPatientId]);

  const profileDocsQ = useWizardProfileDocuments({
    enabled: (opts.mode === 'patient' && Boolean(user?.id)) || Boolean(staffPatientUserId),
    selfPatient: opts.mode === 'patient' && !selectedRelativeId,
    patientUserId: staffPatientUserId ?? undefined,
    relativeId: opts.mode === 'patient' ? selectedRelativeId : null,
  });

  useEffect(() => {
    const map = profileDocsQ.data;
    if (!map) return;
    setPersonalFiles((prev) => {
      const next = { ...prev };
      for (const key of PROFILE_PREFILL_DOC_KEYS) {
        if (next[key]) continue;
        const row = map[key];
        if (!row) continue;
        const ref = profileDocRefFromRow(key, row);
        if (ref) next[key] = ref;
      }
      return next;
    });
  }, [profileDocsQ.data]);

  const section = useMemo((): BookingWizardSection => {
    const n = slotRows.length;
    const nDoc = documentsSlotRows.length;
    const i = wizardIndex;
    if (n === 0) return 'personal';
    if (i < n) return 'slot-datetime';
    if (nDoc > 0 && i < n + nDoc) return 'documents';
    return 'personal';
  }, [slotRows.length, documentsSlotRows.length, wizardIndex]);

  const maxWizardIndex = useMemo(
    () => slotRows.length + documentsSlotRows.length,
    [slotRows.length, documentsSlotRows.length],
  );

  /** Recaler l’index si le nombre de sous-étapes change (web: nouveau.vue). */
  useEffect(() => {
    if (step !== 1) return;
    setWizardIndex((i) => (i > maxWizardIndex ? Math.max(0, maxWizardIndex) : i));
  }, [step, maxWizardIndex]);

  const isFinalWizardStep = section === 'personal';

  const profileAddressLoadedRef = useRef(false);

  useEffect(() => {
    if (opts.mode !== 'patient' || section !== 'personal' || !user?.id) return;
    if (profileAddressLoadedRef.current) return;
    profileAddressLoadedRef.current = true;
    void wizard.loadProfileAddress(user.id);
  }, [opts.mode, section, user?.id, wizard.loadProfileAddress]);

  const wizardStepCount = useMemo(() => {
    const n = slotRows.length;
    const nDoc = documentsSlotRows.length;
    return Math.max(1, n + nDoc + 1);
  }, [slotRows.length, documentsSlotRows.length]);

  const wizardStepCurrent = useMemo(() => {
    if (section === 'personal') return wizardStepCount;
    return wizardIndex + 1;
  }, [section, wizardIndex, wizardStepCount]);

  const activeSlotServiceId = useMemo(() => {
    if (section !== 'slot-datetime') return null;
    return slotRows[wizardIndex]?.id ?? null;
  }, [section, slotRows, wizardIndex]);

  const activeDocumentsServiceId = useMemo(() => {
    if (section !== 'documents') return null;
    const n = slotRows.length;
    const docIdx = wizardIndex - n;
    return documentsSlotRows[docIdx]?.id ?? null;
  }, [section, slotRows.length, documentsSlotRows, wizardIndex]);

  const activeService = useMemo(() => {
    const id = activeSlotServiceId ?? activeDocumentsServiceId;
    return wizard.selectedServices.find((s) => s.id === id) ?? null;
  }, [activeSlotServiceId, activeDocumentsServiceId, wizard.selectedServices]);

  const activeLotServices = useMemo(
    () => servicesInActiveLot(wizard.selectedServices, activeService?.id),
    [activeService?.id, wizard.selectedServices],
  );

  const wizardProgressHint = useMemo(
    () =>
      bookingWizardProgressHint(
        wizard.selectedServices,
        slotRows.length,
        documentsSlotRows.length,
      ),
    [wizard.selectedServices, slotRows.length, documentsSlotRows.length],
  );

  const previousRecaps = useMemo((): WizardRecapItem[] => {
    const recaps: WizardRecapItem[] = [];
    const n = slotRows.length;

    const pushRecap = (svc: SelectedServiceInput) => {
      const data = wizard.formDataByService[svc.id] ?? {};
      recaps.push({
        serviceId: svc.id,
        shortLabel: bookingWizardServiceDisplayName(svc),
        dateLabel: recapDateLabel(String(data.scheduled_at ?? '')),
      });
    };

    if (section === 'slot-datetime') {
      for (let i = 0; i < wizardIndex && i < n; i++) {
        pushRecap(slotRows[i]);
      }
      return recaps;
    }

    if (section === 'documents') {
      const docIdx = wizardIndex - n;
      for (let i = 0; i < docIdx; i++) {
        const svc = documentsSlotRows[i];
        if (svc) pushRecap(svc);
      }
      return recaps;
    }

    return recaps;
  }, [section, slotRows, documentsSlotRows, wizardIndex, wizard.formDataByService]);

  const wizardPageTitle = useMemo(() => {
    if (section === 'personal') return 'Informations personnelles';
    if (section === 'documents') return 'Documents de votre rendez-vous';
    return 'Date de votre rendez-vous';
  }, [section]);

  const confirmStep0 = useCallback(() => {
    if (!wizard.selectedServices.length) {
      toast('Sélectionnez au moins un soin', { type: 'info' });
      return;
    }
    setStep(1);
    setWizardIndex(0);
    setValidationError('');
  }, [wizard.selectedServices.length, toast]);

  const backToCareSelection = useCallback(() => {
    setStep(0);
    setWizardIndex(0);
    setValidationError('');
  }, []);

  const wizardPrev = useCallback(() => {
    setValidationError('');
    if (wizardIndex > 0) {
      setWizardIndex((i) => i - 1);
      return;
    }
    backToCareSelection();
  }, [wizardIndex, backToCareSelection]);

  const setPersonalFile = useCallback((key: string, file: DocumentFileRef | undefined) => {
    setPersonalFiles((prev) => ({ ...prev, [key]: file }));
  }, []);

  const setServiceFiles = useCallback((serviceId: string, key: string, file: DocumentFileRef | undefined) => {
    setFilesByService((prev) => ({
      ...prev,
      [serviceId]: { ...prev[serviceId], [key]: file },
    }));
    wizard.setFormDataByService((fds) => ({
      ...fds,
      [serviceId]: {
        ...fds[serviceId],
        files: { ...(fds[serviceId]?.files as Record<string, unknown>), [key]: file },
      },
    }));
  }, [wizard]);

  const submitMut = useMutation({
    mutationFn: async () => {
      if (opts.mode === 'patient' && !consent) {
        throw new Error('Veuillez accepter la politique de confidentialité.');
      }

      const patient = wizard.form.getValues();
      const address = patient.address
        ? { ...patient.address, complement: wizard.addressComplement || undefined }
        : null;

      const formData: Record<string, unknown> = {
        ...patient,
        address,
        formDataByService: wizard.formDataByService,
      };

      const err = validateUnifiedRdvPayload(formData, wizard.selectedServices, {
        patientEmailOptional: opts.mode === 'dashboard' && (opts.role === 'nurse' || opts.role === 'pro'),
      });
      if (err) throw new Error(err.message);

      if (opts.mode !== 'patient') {
        throw new Error('Soumission réservée au parcours patient');
      }

      const patientId = user?.id;
      if (!patientId) throw new Error('Utilisateur non connecté');

      const firstServiceId = documentsSlotRows[0]?.id ?? slotRows[0]?.id;
      let formDataByService = mergePersonalFilesIntoFormData(
        wizard.formDataByService,
        personalFiles,
        firstServiceId,
      );
      formDataByService = enrichFormDataByServiceForVip(formDataByService, wizard.selectedServices);

      const needsVip = patientBookingNeedsVipPayment(formDataByService, wizard.selectedServices);

      const batchId = randomUUID();
      let payloads = buildDashboardAppointmentPayloads(patientId!, { ...formData, formDataByService }, wizard.selectedServices, {
        creationBatchId: batchId,
        creatorRole: 'patient',
        creatorUserId: user?.id ?? '',
      });

      if (selectedRelativeId) {
        payloads = payloads.map((p) => ({ ...p, relative_id: selectedRelativeId }));
      }

      if (needsVip) {
        const draftFd = await buildPatientBookingDraftFormData(
          payloads as Array<Record<string, unknown> & { files?: Record<string, unknown> }>,
        );
        const draftRes = await createPatientBookingDraft(draftFd);
        if (!draftRes.success || !draftRes.data?.draft_id) {
          throw new Error(draftRes.error ?? 'Échec enregistrement du brouillon');
        }
        const appointmentIds = await patientVipIap.purchaseVipForDraft(draftRes.data.draft_id);
        return appointmentIds[0];
      }

      const result = await createMultipleAppointments(payloads);
      if (!result.success) throw new Error(result.error ?? 'Création impossible');
      return result.createdIds[0];
    },
    onError: (e) => {
      if (e instanceof Error && e.message === 'USER_CANCELLED') return;
      handleApiError(e, toast, 'bookingWizard');
    },
    onSuccess: (id) => {
      toast('Rendez-vous créé', { type: 'success' });
      qc.invalidateQueries({ queryKey: queryKeys.appointments.all });
      if (opts.mode === 'patient') {
        router.replace(id ? `/(patient)/appointment/${id}` as never : '/(patient)/(tabs)/appointments' as never);
      } else if (id) {
        router.replace(`${opts.basePath}/appointment/${id}` as never);
      } else {
        router.replace(`${opts.basePath}/appointments` as never);
      }
    },
  });

  const validateCurrentStep = useCallback(() => {
    const patient = wizard.form.getValues();
    const address = patient.address
      ? { ...patient.address, complement: wizard.addressComplement || undefined }
      : null;
    const missing = validateBookingWizardSubstep(section, {
      slotRows,
      documentsSlotRows,
      wizardIndex,
      formDataByService: wizard.formDataByService,
      mode: opts.mode,
      patientMode: wizard.patientMode,
      selectedPatientId: wizard.selectedPatientId,
      consent,
      patientFormData: { ...patient, address },
      selectedServices: wizard.selectedServices,
      patientEmailOptional: opts.mode === 'dashboard' && (opts.role === 'nurse' || opts.role === 'pro'),
    });
    if (missing.length > 0) {
      const msg =
        missing.length === 1
          ? missing[0]
          : missing.map((m, i) => `${i + 1}. ${m}`).join('\n');
      setValidationError(msg);
      const needsConsent =
        section === 'personal' &&
        !consent &&
        missing.some(
          (m) =>
            m.includes('RGPD') ||
            m.includes('politique de confidentialité') ||
            m.includes('confidentialité') ||
            m.includes('consentement'),
        );
      if (needsConsent) {
        opts.onConsentMissing?.();
      }
      toast(msg.split('\n')[0] ?? msg, { type: 'error' });
      return false;
    }
    setValidationError('');
    return true;
  }, [
    section,
    slotRows,
    documentsSlotRows,
    wizardIndex,
    wizard.formDataByService,
    wizard.patientMode,
    wizard.selectedPatientId,
    wizard.selectedServices,
    wizard.form,
    wizard.addressComplement,
    opts.mode,
    opts.role,
    consent,
    toast,
    opts.onConsentMissing,
  ]);

  const wizardNext = useCallback(() => {
    void (async () => {
      if (isFinalWizardStep && opts.mode === 'patient' && selectedRelativeId) {
        await applyRelativeToForm(selectedRelativeId);
      }
      if (isFinalWizardStep) {
        if (!validateCurrentStep()) return;
        if (opts.mode === 'patient') submitMut.mutate();
        else {
          wizard.setPersonalFiles(personalFiles);
          wizard.submit();
        }
        return;
      }
      if (!validateCurrentStep()) return;
      if (wizardIndex < maxWizardIndex) {
        setWizardIndex((i) => i + 1);
      } else {
        setWizardIndex(maxWizardIndex);
      }
    })();
  }, [
    isFinalWizardStep,
    validateCurrentStep,
    maxWizardIndex,
    wizardIndex,
    submitMut,
    opts.mode,
    opts.role,
    selectedRelativeId,
    applyRelativeToForm,
    personalFiles,
    wizard,
  ]);

  return {
    step,
    wizard,
    slotRows,
    documentsSlotRows,
    allCategories,
    confirmStep0,
    backToCareSelection,
    wizardPrev,
    wizardNext,
    section,
    isFinalWizardStep,
    wizardPageTitle,
    wizardStepCount,
    wizardStepCurrent,
    activeService,
    activeLotServices,
    activeSlotServiceId,
    activeDocumentsServiceId,
    previousRecaps,
    wizardProgressHint,
    filesByService,
    setServiceFiles,
    personalFiles,
    setPersonalFile,
    profileDocs: profileDocsQ.data ?? {},
    profileDocsLoading: profileDocsQ.isLoading,
    staffPatientUserId,
    careSkipsPrescription,
    consent,
    setConsent,
    selectedRelativeId,
    setSelectedRelativeId: selectRelative,
    applyRelativeToForm,
    relatives: relativesQ.data ?? [],
    relativesLoading: relativesQ.isLoading,
    saving: wizard.saving || submitMut.isPending || patientVipIap.purchaseLoading,
    validationError,
    submit: () => submitMut.mutate(),
  };
}
