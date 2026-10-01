import { ResumableAppointmentBatch } from '@oneandlab/shared-utils';
import { useRef, useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import {
  buildDashboardAppointmentPayloads,
  filterStaffOnlyCareCategoriesForPatient,
  NURSE_BLOOD_TEST_AWAITING_LAB_MESSAGE,
  nurseBookingAwaitsLabConfirmation,
  validateUnifiedRdvPayload,
  validateLabPreferenceBeforeSubmit,
  type SelectedServiceInput,
} from '@oneandlab/shared-utils';
import type { LabPreferenceMode } from '@oneandlab/shared-types';
import { queryKeys } from '@/lib/query-keys';
import { useToast } from '@/providers/ToastProvider';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { fetchAllPatients } from '@/features/patients/api/fetch-all-patients';
import { patientPickerOptionFromRow } from '@/features/patients/utils/patient-contact-display';
import { adoptStaffPatient, createPatient } from '@/features/patients/api/patients.service';
import { patientRowFromLookup } from '@/features/patients/api/patient-lookup.service';
import {
  appointmentCreateErrorMessage,
  firstApiErrorMessage,
  patientAdoptErrorMessage,
  patientCreateErrorMessage,
  type PatientLookupResult,
} from '@oneandlab/shared-api';
import {
  fetchCareCategories,
  fetchCareCategoryOptions,
  type CareCategory,
} from '@/features/categories/api/categories.service';
import { CACHE_STALE_CATEGORIES_MS } from '@oneandlab/shared-constants';
import { STAFF_PATIENT_BOOKING_CONSENT_ERROR } from '@oneandlab/shared-constants';
import {
  formDataSliceForQuickAddedService,
  type BookingServiceFormSlice,
} from '../utils/booking-service-form-slice';
import { createMultipleAppointments, type AppointmentCreatePayload } from '@/features/appointments/api/create-multiple-appointments';
import { randomUUID } from '@/lib/uuid';
import type { PatientRow } from '@/features/patients/api/fetch-all-patients';
import { useAuthStore } from '@/store/auth-store';
import { appointmentDetailHref, appointmentsListHref } from '@/navigation/role-hrefs';
import type { RoleRoutePrefix } from '@/navigation/role-route-prefix';
import { NEW_PATIENT_ID } from '../types';
import { mergePersonalFilesIntoFormData } from '../utils/merge-wizard-files';
import {
  isBloodTestOnlyBookingRole,
  isPatientEmailOptionalForBookingRole,
  skipsLabPreferenceStepForBookingRole,
} from '../utils/booking-wizard-role-rules';
import {
  applyProNurseAssignmentToPayloads,
  type ProNurseAssignment,
} from '../utils/pro-nurse-assignment';
import type { DocumentFileRef } from '../types/document-file-ref';
import {
  RELATIVE_PROFILE_UPLOAD_TYPES,
  uploadPatientProfileDocument,
  uploadRelativeProfileDocument,
  type PatientProfileUploadType,
  type RelativeProfileUploadType,
} from '@/features/patients/api/patient-profile.service';
import { updatePatient } from '@/features/patients/api/patients.service';
import { normalizePatientGender } from '@/utils/patient-gender';
import { useProfileAddressSync } from './useProfileAddressSync';
import { useSelectedPatient } from './useSelectedPatient';
import type { BookingDraftData } from '../utils/booking-draft';

export function useMultiAppointmentWizard(opts: {
  role: string;
  basePath: RoleRoutePrefix;
  initialPatientId?: string;
  /** Parcours patient connecté : sync adresse sur /users/:id */
  syncPatientSelfAddress?: boolean;
  patientRelativeId?: string | null;
  bookingMode?: 'patient' | 'dashboard';
  getPatientBookingConsent?: () => boolean;
  getProNurseAssignment?: () => ProNurseAssignment | null;
  getLabPreference?: () => { mode: LabPreferenceMode | ''; brandId: string | null };
  /** Brouillon local repris : valeurs initiales du tunnel de création. */
  initialDraft?: BookingDraftData | null;
  /** Appelé dès que les RDV sont créés côté serveur. */
  onCreated?: () => void;
}) {
  const bookingBatchAttempt = useRef(new ResumableAppointmentBatch<AppointmentCreatePayload>());
  const createdPatientForAttempt = useRef<string | null>(null);
  const { show: toast } = useToast();
  const router = useRouter();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const draft = opts.initialDraft ?? null;
  const [selectedServices, setSelectedServices] = useState<SelectedServiceInput[]>(
    () => draft?.selectedServices ?? [],
  );
  const [selectedPatientId, setSelectedPatientId] = useState(
    opts.initialPatientId ?? draft?.selectedPatientId ?? '',
  );
  const [patientMode, setPatientMode] = useState<'existing' | 'new'>(
    opts.initialPatientId ? 'existing' : (draft?.patientMode ?? 'existing'),
  );
  useEffect(() => {
    if (patientMode === 'existing') createdPatientForAttempt.current = null;
  }, [patientMode]);
  const [addressComplement, setAddressComplement] = useState(draft?.addressComplement ?? '');
  const [pinnedLookupPatient, setPinnedLookupPatient] = useState<PatientRow | null>(null);

  const form = useForm({
    defaultValues: {
      first_name: draft?.patient.first_name ?? '',
      last_name: draft?.patient.last_name ?? '',
      email: draft?.patient.email ?? '',
      phone: draft?.patient.phone ?? '',
      gender: draft?.patient.gender ?? '',
      birth_date: draft?.patient.birth_date ?? '',
      address: draft?.patient.address ?? null,
    },
  });

  const getProfileId = useCallback(() => {
    if (opts.syncPatientSelfAddress && user?.id) return opts.patientRelativeId ? null : user.id;
    if (patientMode === 'existing' && selectedPatientId && selectedPatientId !== NEW_PATIENT_ID) {
      return selectedPatientId;
    }
    return null;
  }, [opts.syncPatientSelfAddress, opts.patientRelativeId, user?.id, patientMode, selectedPatientId]);

  const addressSync = useProfileAddressSync({
    getProfileId,
    isPatientSelf: !!opts.syncPatientSelfAddress,
    setFormAddress: (addr) => form.setValue('address', addr),
    getFormAddress: () => form.getValues('address'),
    addressComplement,
    setAddressComplement,
  });

  const [formDataByService, setFormDataByService] = useState<
    Record<string, Record<string, unknown>>
  >(() => draft?.formDataByService ?? {});
  const [personalFiles, setPersonalFiles] = useState<
    Record<string, DocumentFileRef | undefined>
  >({});

  const isPatientBooking = opts.bookingMode === 'patient' || opts.syncPatientSelfAddress === true;

  const patientsQ = useQuery({
    queryKey: queryKeys.patients.list(),
    queryFn: () => fetchAllPatients(),
    enabled: !isPatientBooking,
  });

  const selectedPatientRecord = useSelectedPatient((p, address) => {
    form.reset({
      first_name: p.first_name ?? '', last_name: p.last_name ?? '', email: p.email ?? '',
      phone: p.phone ?? '', gender: normalizePatientGender(p.gender), birth_date: p.birth_date ?? '',
      address,
    });
    setAddressComplement(address?.complement ?? '');
  }, () => {
    form.reset({ first_name: '', last_name: '', email: '', phone: '', gender: '', birth_date: '', address: null });
    setAddressComplement('');
    setPersonalFiles({});
  });
  const { load: loadSelectedPatient, reset: resetSelectedPatient } = selectedPatientRecord;
  const fillWizardPatient = useCallback((p: PatientRow) => loadSelectedPatient(p.id), [loadSelectedPatient]);
  useEffect(() => {
    if (!opts.initialPatientId || isPatientBooking) return;
    setSelectedPatientId(opts.initialPatientId);
    void loadSelectedPatient(opts.initialPatientId);
  }, [opts.initialPatientId, isPatientBooking, loadSelectedPatient]);

  const changePatientMode = useCallback((mode: 'existing' | 'new') => {
    if (mode === patientMode) return;
    resetSelectedPatient();
    setSelectedPatientId('');
    setPinnedLookupPatient(null);
    setPatientMode(mode);
  }, [patientMode, resetSelectedPatient]);

  const onSelectPatient = useCallback(
    (id: string, opts?: { keepMode?: boolean }) => {
      setSelectedPatientId(id);
      const isNew = id === NEW_PATIENT_ID;
      if (!isNew && pinnedLookupPatient?.id !== id) {
        setPinnedLookupPatient(null);
      }
      if (!opts?.keepMode) {
        if (isNew) {
          setPatientMode('new');
          setPinnedLookupPatient(null);
        } else {
          setPatientMode('existing');
        }
      }
      if (!isNew) {
        const p =
          patientsQ.data?.find((x) => x.id === id) ??
          (pinnedLookupPatient?.id === id ? pinnedLookupPatient : undefined);
        if (p) void fillWizardPatient(p);
        else void loadSelectedPatient(id);
      } else {
        resetSelectedPatient();
      }
    },
    [patientsQ.data, fillWizardPatient, pinnedLookupPatient, loadSelectedPatient, resetSelectedPatient],
  );

  const patientOptions = useMemo(() => {
    const base = (patientsQ.data ?? []).map(patientPickerOptionFromRow);
    if (!pinnedLookupPatient) return base;
    if (base.some((p) => p.id === pinnedLookupPatient.id)) return base;
    return [patientPickerOptionFromRow(pinnedLookupPatient), ...base];
  }, [patientsQ.data, pinnedLookupPatient]);

  const { getPatientBookingConsent } = opts;
  const adoptLookupPatient = useCallback(
    async (match: PatientLookupResult): Promise<boolean> => {
      const consent = getPatientBookingConsent?.() === true;
      try {
        const res = await adoptStaffPatient(match.patient.id, match.contact, consent);
        if (!res.success) throw new Error(res.error ?? 'Impossible d’utiliser ce dossier.');
      } catch (e) {
        handleApiError(e, toast, 'adoptLookupPatient', 'Impossible d’utiliser ce dossier.', patientAdoptErrorMessage);
        return false;
      }
      const row = patientRowFromLookup(match.patient);
      setPinnedLookupPatient(row);
      if (!patientsQ.data?.some((x) => x.id === row.id)) {
        void patientsQ.refetch();
      }
      setPatientMode('existing');
      setSelectedPatientId(row.id);
      void fillWizardPatient(row);
      return true;
    },
    [fillWizardPatient, getPatientBookingConsent, patientsQ, toast],
  );

  const bloodTestOnly = isBloodTestOnlyBookingRole(opts.role);

  const nursingCatsQ = useQuery({
    queryKey: queryKeys.categories.list('nursing', 'picker'),
    queryFn: async () => {
      const res = await fetchCareCategories('nursing', 'picker');
      return res.data ?? [];
    },
    staleTime: CACHE_STALE_CATEGORIES_MS,
    enabled: !bloodTestOnly,
  });
  const bloodCatsQ = useQuery({
    queryKey: queryKeys.categories.list('blood_test', 'picker'),
    queryFn: async () => {
      const res = await fetchCareCategories('blood_test', 'picker');
      return res.data ?? [];
    },
    staleTime: CACHE_STALE_CATEGORIES_MS,
  });

  const ensureCategoryReady = useCallback(
    async (cat: CareCategory): Promise<CareCategory> => {
      if ((cat.options?.length ?? 0) > 0) return cat;
      const res = await fetchCareCategoryOptions(cat.id);
      const options = res.data ?? [];
      const patchList = (prev: CareCategory[] | undefined) =>
        (prev ?? []).map((c) => (c.id === cat.id ? { ...c, options } : c));
      qc.setQueryData(queryKeys.categories.list('nursing', 'picker'), patchList);
      qc.setQueryData(queryKeys.categories.list('blood_test', 'picker'), patchList);
      return { ...cat, options };
    },
    [qc],
  );

  const nursingSource = useMemo(
    () => (bloodTestOnly ? [] : (nursingCatsQ.data ?? [])),
    [bloodTestOnly, nursingCatsQ.data],
  );

  const allCategories = useMemo((): CareCategory[] => {
    const merged = [...nursingSource, ...(bloodCatsQ.data ?? [])];
    return isPatientBooking ? filterStaffOnlyCareCategoriesForPatient(merged) : merged;
  }, [nursingSource, bloodCatsQ.data, isPatientBooking]);

  const nursingCategories = useMemo(
    () =>
      isPatientBooking
        ? filterStaffOnlyCareCategoriesForPatient(nursingSource)
        : nursingSource,
    [nursingSource, isPatientBooking],
  );

  const bloodCategories = useMemo(
    () =>
      isPatientBooking
        ? filterStaffOnlyCareCategoriesForPatient(bloodCatsQ.data ?? [])
        : (bloodCatsQ.data ?? []),
    [bloodCatsQ.data, isPatientBooking],
  );

  const quickAddService = useCallback(
    (payload: { service: SelectedServiceInput; slice: BookingServiceFormSlice }) => {
      const { service, slice } = payload;
      const merged = formDataSliceForQuickAddedService({
        serviceType: service.type,
        slice,
        priorSelectedServices: selectedServices,
        priorFormDataByService: formDataByService as Record<string, BookingServiceFormSlice | undefined>,
        careCategory: { name: service.name, label: service.name },
      });
      setSelectedServices((prev) => {
        const without = prev.filter((s) => s.id !== service.id);
        return [...without, service];
      });
      setFormDataByService((fds) => ({
        ...fds,
        [service.id]: {
          scheduled_at: '',
          availability: JSON.stringify({ type: 'all_day' }),
          preferred_nurse_gender: 'any',
          ...merged,
        },
      }));
    },
    [selectedServices, formDataByService],
  );

  const removeService = useCallback((serviceId: string) => {
    setSelectedServices((prev) => prev.filter((s) => s.id !== serviceId));
    setFormDataByService((fds) => {
      const next = { ...fds };
      delete next[serviceId];
      return next;
    });
  }, []);

  const [submissionLocked, setSubmissionLocked] = useState(false);

  const submitMut = useMutation({
    mutationFn: async () => {
      if (!isPatientBooking && patientMode === 'existing' && (selectedPatientRecord.loading || selectedPatientRecord.error)) {
        throw new Error('Rechargez le dossier patient avant de confirmer le rendez-vous.');
      }
      if (
        opts.bookingMode === 'dashboard' &&
        opts.getPatientBookingConsent &&
        !opts.getPatientBookingConsent()
      ) {
        throw new Error(STAFF_PATIENT_BOOKING_CONSENT_ERROR);
      }

      const patient = form.getValues();
      const address = patient.address
        ? { ...patient.address, complement: addressComplement || undefined }
        : null;
      const labPref = opts.getLabPreference?.();
      const formData: Record<string, unknown> = {
        ...patient,
        address,
        formDataByService,
        lab_preference_mode: labPref?.mode || 'platform_match',
        preferred_lab_brand_id:
          labPref?.mode === 'brand_choice' ? labPref.brandId : null,
      };

      const labErr = validateLabPreferenceBeforeSubmit(
        selectedServices,
        (labPref?.mode as LabPreferenceMode | '') || 'platform_match',
        labPref?.brandId,
        { skipForProviderBooking: skipsLabPreferenceStepForBookingRole(opts.role) },
      );
      if (labErr) throw new Error(labErr);

      const err = validateUnifiedRdvPayload(formData, selectedServices, {
        patientEmailOptional: isPatientEmailOptionalForBookingRole(opts.role),
      });
      if (err) throw new Error(err.message);

      let patientId =
        selectedPatientId && selectedPatientId !== NEW_PATIENT_ID ? selectedPatientId : undefined;

      if (patientMode === 'new' && !patientId && createdPatientForAttempt.current) patientId = createdPatientForAttempt.current;

      if (!patientId && (patientMode === 'new' || !selectedPatientId)) {
        const pRes = await createPatient({
          first_name: patient.first_name.trim(),
          last_name: patient.last_name.trim(),
          phone: patient.phone.trim(),
          birth_date: patient.birth_date,
          gender: patient.gender,
          address: address ?? undefined,
          ...(patient.email?.trim() ? { email: patient.email.trim() } : {}),
          patient_booking_consent: true,
        });
        if (!pRes.success || !pRes.data?.id) throw new Error(pRes.error ?? 'Création patient impossible');
        patientId = pRes.data.id;
        createdPatientForAttempt.current = patientId;
      }

      if (!patientId) throw new Error('Patient introuvable ou incomplet');

      const genderNorm = normalizePatientGender(patient.gender);
      if (patientMode === 'existing' && patientId && !opts.patientRelativeId) {
        const syncBody: Record<string, unknown> = {
          first_name: patient.first_name.trim(),
          last_name: patient.last_name.trim(),
          gender: genderNorm,
          birth_date: patient.birth_date,
          phone: patient.phone?.trim() || undefined,
          ...(patient.email?.trim() ? { email: patient.email.trim() } : {}),
          ...(address ? { address } : {}),
        };
        const upd = await updatePatient(patientId, syncBody);
        if (!upd.success) throw new Error(upd.error ?? 'Mise à jour patient impossible');
      }

      for (const [key, file] of Object.entries(personalFiles)) {
        if (!file || !('uri' in file)) continue;
        try {
          const payload = {
            uri: file.uri,
            fileName: file.name,
            mimeType: file.mimeType ?? 'image/jpeg',
          };
          if (opts.patientRelativeId) {
            if (!RELATIVE_PROFILE_UPLOAD_TYPES.includes(key as RelativeProfileUploadType)) continue;
            await uploadRelativeProfileDocument(
              opts.patientRelativeId,
              key as RelativeProfileUploadType,
              payload,
            );
          } else {
            await uploadPatientProfileDocument(patientId, key as PatientProfileUploadType, payload);
          }
        } catch (e) {
          if (__DEV__) console.warn('[wizard personal upload]', key, e);
        }
      }

      const firstServiceId = selectedServices[0]?.id;
      const mergedFormData = {
        ...formData,
        formDataByService: mergePersonalFilesIntoFormData(
          formDataByService,
          personalFiles,
          firstServiceId,
        ),
      };

      const batchId = randomUUID();
      let payloads = buildDashboardAppointmentPayloads(patientId, mergedFormData, selectedServices, {
        creationBatchId: batchId,
        creatorRole: opts.role,
        creatorUserId: user?.id ?? '',
      }).map((p) => {
        const type = typeof p.type === 'string' ? p.type : selectedServices[0]?.type;
        return {
          ...p,
          ...(opts.patientRelativeId ? { relative_id: opts.patientRelativeId } : {}),
          patient_booking_consent: true,
          type,
          form_type: typeof p.form_type === 'string' ? p.form_type : type,
        };
      });

      payloads = applyProNurseAssignmentToPayloads(
        payloads,
        opts.getProNurseAssignment?.() ?? null,
      );

      const result = await createMultipleAppointments(payloads, bookingBatchAttempt.current);
      return {
        id: result.createdIds[0],
        warning: result.warning,
        fallbackList: result.fallbackList === true,
        awaitsLab: nurseBookingAwaitsLabConfirmation(opts.role, payloads),
      };
    },
    onSuccess: ({ id, warning, fallbackList, awaitsLab }) => {
      opts.onCreated?.();
      if (fallbackList || !id) {
        toast(warning ?? 'Si le rendez-vous apparaît dans la liste, ne le recréez pas.', {
          type: 'warning',
        });
        qc.invalidateQueries({ queryKey: queryKeys.appointments.all });
        router.replace(appointmentsListHref(opts.basePath));
        return;
      }
      if (warning) {
        toast(warning, { type: 'warning' });
      } else {
        toast(awaitsLab ? NURSE_BLOOD_TEST_AWAITING_LAB_MESSAGE : 'Rendez-vous créé', { type: 'success' });
      }
      qc.invalidateQueries({ queryKey: queryKeys.appointments.all });
      router.replace(appointmentDetailHref(opts.basePath, id));
    },
    onError: (e) =>
      handleApiError(
        e,
        toast,
        'wizardSubmit',
        undefined,
        firstApiErrorMessage(patientCreateErrorMessage, appointmentCreateErrorMessage),
      ),
  });

  return {
    form,
    selectedServices,
    quickAddService,
    removeService,
    allCategories,
    formDataByService,
    setFormDataByService,
    personalFiles,
    setPersonalFiles: (
      files: Record<string, DocumentFileRef | undefined>,
    ) => setPersonalFiles(files),
    selectedPatientId,
    setSelectedPatientId,
    patientMode,
    setPatientMode: changePatientMode,
    onSelectPatient,
    adoptLookupPatient,
    patientOptions,
    patientProfileLoading: selectedPatientRecord.loading,
    patientProfileError: selectedPatientRecord.error,
    retryPatientProfile: selectedPatientRecord.retry,
    patientsLoading: patientsQ.isFetching,
    patientsError: patientsQ.isError,
    retryPatients: () => { void patientsQ.refetch(); },
    addressComplement,
    setAddressComplement,
    onAddressChange: addressSync.onAddressChange,
    onComplementChange: addressSync.onComplementChange,
    loadProfileAddress: addressSync.loadProfileAddress,
    patients: patientsQ.data ?? [],
    nursingCategories,
    bloodCategories,
    loading:
      isPatientBooking
        ? nursingCatsQ.isLoading || bloodCatsQ.isLoading
        : patientsQ.isLoading || nursingCatsQ.isLoading || bloodCatsQ.isLoading,
    categoriesError: nursingCatsQ.error ?? bloodCatsQ.error,
    retryCategories: () => {
      if (nursingCatsQ.isError) void nursingCatsQ.refetch();
      if (bloodCatsQ.isError) void bloodCatsQ.refetch();
    },
    ensureCategoryReady,
    saving: submitMut.isPending || submissionLocked,
    submit: useCallback(() => {
      if (submissionLocked || submitMut.isPending) return;
      setSubmissionLocked(true);
      submitMut.mutate(undefined, {
        onError: () => setSubmissionLocked(false),
      });
    }, [submitMut, submissionLocked]),
    isNewPatient: patientMode === 'new',
  };
}
