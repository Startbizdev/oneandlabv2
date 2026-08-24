import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import {
  buildDashboardAppointmentPayloads,
  filterStaffOnlyCareCategoriesForPatient,
  validateUnifiedRdvPayload,
  type SelectedServiceInput,
} from '@oneandlab/shared-utils';
import { queryKeys } from '@/lib/query-keys';
import { useToast } from '@/providers/ToastProvider';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { fetchAllPatients } from '@/features/patients/api/fetch-all-patients';
import { patientPickerOptionFromRow } from '@/features/patients/utils/patient-contact-display';
import { createPatient } from '@/features/patients/api/patients.service';
import { lookupPatientByContact } from '@/features/patients/api/patient-lookup.service';
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
import { isBloodTestAppointment, isNursingAppointment } from '@oneandlab/shared-utils';
import {
  createAppointment,
  fetchAppointment,
  updateAppointment,
} from '@/features/appointments/api/appointments.service';
import { createMultipleAppointments } from '@/features/appointments/api/create-multiple-appointments';
import { uploadAppointmentDocuments } from '@/features/appointments/api/upload-appointment-documents';
import { randomUUID } from '@/lib/uuid';
import type { PatientRow } from '@/features/patients/api/fetch-all-patients';
import { useAuthStore } from '@/store/auth-store';
import type { AppointmentFormValues, AddressPayload } from '../types';
import { NEW_PATIENT_ID } from '../types';
import { buildSingleAppointmentPayload } from '../utils/build-single-payload';
import { mergePersonalFilesIntoFormData } from '../utils/merge-wizard-files';
import {
  applyProNurseAssignmentToPayloads,
  type ProNurseAssignment,
} from '../utils/pro-nurse-assignment';
import type { DocumentFileRef } from '../types/document-file-ref';
import {
  uploadPatientProfileDocument,
  type PatientProfileUploadType,
} from '@/features/patients/api/patient-profile.service';
import { buildAvailabilityPayload, isAvailabilityValid } from '../utils/availability';
import { appointmentFormSchema, type AppointmentFormSchema } from '../schemas/appointment-form.schema';
import { fetchUser } from '@/features/profile/api/profile.service';
import { updatePatient } from '@/features/patients/api/patients.service';
import { normalizePatientGender } from '@/utils/patient-gender';
import { useProfileAddressSync } from './useProfileAddressSync';

const defaultValues: AppointmentFormSchema = {
  is_new_patient: false,
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  gender: '',
  birth_date: '',
  address: undefined,
  type: 'nursing',
  category_id: '',
  scheduled_at: '',
  availability_type: 'all_day',
  availability_range: [8, 12],
  files: {},
};

export function useAppointmentForm(opts: {
  mode: 'create' | 'edit';
  appointmentId?: string;
  role: string;
  basePath: string;
  defaultType?: string;
  patientEmailOptional?: boolean;
}) {
  const { show: toast } = useToast();
  const router = useRouter();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const staffRequiresPatientConsent =
    opts.mode === 'create' &&
    (opts.role === 'pro' || opts.role === 'nurse' || opts.role === 'lab' || opts.role === 'subaccount');
  const [patientBookingConsent, setPatientBookingConsent] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [addressComplement, setAddressComplement] = useState('');

  const form = useForm<AppointmentFormSchema>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: { ...defaultValues, type: opts.defaultType ?? 'nursing' },
  });

  const { watch, setValue, reset, handleSubmit, formState } = form;
  const values = watch();

  const patientsQ = useQuery({
    queryKey: queryKeys.patients.list(),
    queryFn: () => fetchAllPatients(),
    enabled: opts.role !== 'patient',
  });

  const categoriesQ = useQuery({
    queryKey: queryKeys.categories.list(values.type),
    queryFn: async () => {
      const res = await fetchCareCategories(values.type);
      return res.data ?? [];
    },
  });

  const appointmentQ = useQuery({
    queryKey: queryKeys.appointments.detail(opts.appointmentId ?? ''),
    queryFn: async () => {
      const res = await fetchAppointment(opts.appointmentId!);
      return res.data;
    },
    enabled: opts.mode === 'edit' && !!opts.appointmentId,
  });

  useEffect(() => {
    const apt = appointmentQ.data;
    if (opts.mode !== 'edit' || !apt) return;
    const fd = (apt.form_data ?? {}) as Record<string, unknown>;
    let addr: AddressPayload | null = null;
    if (apt.address) {
      try {
        addr =
          typeof apt.address === 'string' && apt.address.startsWith('{')
            ? (JSON.parse(apt.address) as AddressPayload)
            : { label: apt.address, lat: 0, lng: 0 };
      } catch {
        addr = { label: String(apt.address), lat: 0, lng: 0 };
      }
    }
    reset({
      ...defaultValues,
      patient_id: apt.patient_id,
      first_name: String(fd.first_name ?? ''),
      last_name: String(fd.last_name ?? ''),
      email: String(fd.email ?? ''),
      phone: String(fd.phone ?? ''),
      gender: String(fd.gender ?? ''),
      birth_date: String(fd.birth_date ?? ''),
      address: addr ?? undefined,
      type: apt.type ?? 'nursing',
      category_id: apt.category_id ?? '',
      scheduled_at: apt.scheduled_at ?? '',
      notes: String(fd.notes ?? ''),
      files: {},
    });
    if (apt.patient_id) setSelectedPatientId(apt.patient_id);
  }, [appointmentQ.data, opts.mode, reset]);

  const patientOptions = useMemo(
    () => (patientsQ.data ?? [] as PatientRow[]).map(patientPickerOptionFromRow),
    [patientsQ.data],
  );

  const setField = useCallback(
    (field: string, v: string) => {
      setValue(field as keyof AppointmentFormSchema, v as never);
    },
    [setValue],
  );

  const createMut = useMutation({
    mutationFn: async (data: AppointmentFormSchema) => {
      if (staffRequiresPatientConsent && !patientBookingConsent) {
        throw new Error(STAFF_PATIENT_BOOKING_CONSENT_ERROR);
      }
      if (!isAvailabilityValid(data.availability_type, data.availability_range)) {
        throw new Error('Plage horaire trop courte (minimum 1 h)');
      }
      const address = data.address
        ? { ...data.address, complement: addressComplement || undefined }
        : null;
      if (!address) throw new Error('Adresse incomplète');

      let patientId = selectedPatientId && selectedPatientId !== NEW_PATIENT_ID ? selectedPatientId : undefined;

      if (!patientId) {
        const lookup = await lookupPatientByContact(data.email ?? '', data.phone ?? '');
        if (lookup.success && lookup.data?.id) patientId = lookup.data.id;
      }

      if (data.is_new_patient || selectedPatientId === NEW_PATIENT_ID) {
        const pRes = await createPatient({
          first_name: data.first_name.trim(),
          last_name: data.last_name.trim(),
          phone: data.phone.trim(),
          birth_date: data.birth_date,
          gender: data.gender,
          address,
          ...(data.email?.trim() ? { email: data.email.trim() } : {}),
          ...(staffRequiresPatientConsent ? { patient_booking_consent: true } : {}),
        });
        if (!pRes.success || !pRes.data?.id) throw new Error(pRes.error ?? 'Création patient impossible');
        patientId = pRes.data.id;
      }

      const merged = { ...data, address } as AppointmentFormValues;
      let createStatus = 'pending';
      if (opts.role === 'nurse' && user?.id) {
        if (isNursingAppointment(merged.type) || isBloodTestAppointment(merged.type)) {
          createStatus = 'confirmed';
        }
      }
      const body = buildSingleAppointmentPayload(merged, patientId, createStatus);
      if (staffRequiresPatientConsent) {
        body.patient_booking_consent = true;
      }
      if (opts.role === 'nurse' && user?.id && createStatus === 'confirmed') {
        body.assigned_nurse_id = user.id;
      }
      const res = await createAppointment(body);
      if (!res.success || !res.data?.id) throw new Error(res.error ?? 'Création impossible');
      await uploadAppointmentDocuments(res.data.id, body);
      return res.data.id;
    },
    onSuccess: (id) => {
      toast('Rendez-vous créé', { type: 'success' });
      qc.invalidateQueries({ queryKey: queryKeys.appointments.all });
      router.replace(`${opts.basePath}/appointment/${id}` as never);
    },
    onError: (e) => handleApiError(e, toast, 'createAppointment'),
  });

  const updateMut = useMutation({
    mutationFn: async (data: AppointmentFormSchema) => {
      if (!opts.appointmentId) throw new Error('ID manquant');
      const address = data.address
        ? { ...data.address, complement: addressComplement || undefined }
        : null;
      if (!address) throw new Error('Adresse incomplète');
      const merged = { ...data, address } as AppointmentFormValues;
      const aptRow = appointmentQ.data;
      let saveStatus = aptRow?.status ?? 'pending';
      const assignedNurse = (aptRow as { assigned_nurse_id?: string } | undefined)?.assigned_nurse_id;
      if (
        opts.role === 'nurse' &&
        isNursingAppointment(data.type) &&
        (assignedNurse === user?.id || aptRow?.created_by === user?.id)
      ) {
        saveStatus = 'confirmed';
      }
      const body = buildSingleAppointmentPayload(merged, data.patient_id, saveStatus);
      const res = await updateAppointment(opts.appointmentId, body);
      if (!res.success) throw new Error(res.error ?? 'Mise à jour impossible');
      await uploadAppointmentDocuments(opts.appointmentId, body);
    },
    onSuccess: () => {
      toast('Rendez-vous mis à jour', { type: 'success' });
      void qc.invalidateQueries({ queryKey: queryKeys.appointments.all });
      void qc.invalidateQueries({
        queryKey: queryKeys.appointments.detail(opts.appointmentId ?? ''),
      });
      router.back();
    },
    onError: (e) => handleApiError(e, toast, 'updateAppointment'),
  });

  const addressSync = useProfileAddressSync({
    getProfileId: () => {
      if (selectedPatientId && selectedPatientId !== NEW_PATIENT_ID) return selectedPatientId;
      return null;
    },
    isPatientSelf: false,
    setFormAddress: (addr) => setValue('address', addr ?? undefined),
    getFormAddress: () => form.getValues('address') ?? null,
    addressComplement,
    setAddressComplement,
  });

  const fillPatientFields = useCallback(
    async (p: PatientRow) => {
      setValue('patient_id', p.id);
      setValue('first_name', p.first_name ?? '');
      setValue('last_name', p.last_name ?? '');
      setValue('email', p.email ?? '');
      setValue('phone', p.phone ?? '');
      setValue('gender', (p.gender as string) ?? '');
      setValue('birth_date', (p.birth_date as string) ?? '');
      let full: PatientRow = p;
      try {
        const res = await fetchUser(p.id);
        if (res.success && res.data) full = { ...p, ...(res.data as PatientRow) };
      } catch {
        /* données liste */
      }
      await addressSync.applyFromRaw(full.address);
    },
    [setValue, addressSync],
  );

  const onSelectPatient = useCallback(
    (id: string) => {
      setSelectedPatientId(id);
      const isNew = id === NEW_PATIENT_ID;
      setValue('is_new_patient', isNew);
      if (!isNew) {
        const p = patientsQ.data?.find((x) => x.id === id);
        if (p) void fillPatientFields(p);
      }
    },
    [patientsQ.data, setValue, fillPatientFields],
  );

  const submit = handleSubmit((data) => {
    if (opts.mode === 'create') createMut.mutate(data);
    else updateMut.mutate(data);
  });

  return {
    form,
    control: form.control,
    values: values as AppointmentFormValues,
    setValue,
    setField,
    selectedPatientId,
    setSelectedPatientId,
    addressComplement,
    setAddressComplement,
    onAddressChange: addressSync.onAddressChange,
    onComplementChange: addressSync.onComplementChange,
    patientOptions,
    categories: categoriesQ.data ?? [],
    loading: patientsQ.isLoading || categoriesQ.isLoading || appointmentQ.isLoading,
    saving: createMut.isPending || updateMut.isPending,
    submit,
    errors: formState.errors,
    categoriesLoading: categoriesQ.isLoading,
    onSelectCategory: (cat: { id: string; type: string }) => {
      setValue('category_id', cat.id);
      setValue('type', cat.type);
    },
    onSelectPatient,
    patientBookingConsent,
    setPatientBookingConsent,
    staffRequiresPatientConsent,
    setValues: (fn: (prev: AppointmentFormValues) => AppointmentFormValues) => {
      const next = fn(values as AppointmentFormValues);
      reset(next as AppointmentFormSchema);
    },
  };
}

export function useMultiAppointmentWizard(opts: {
  role: string;
  basePath: string;
  initialPatientId?: string;
  /** Parcours patient connecté : sync adresse sur /users/:id */
  syncPatientSelfAddress?: boolean;
  bookingMode?: 'patient' | 'dashboard';
  getPatientBookingConsent?: () => boolean;
  getProNurseAssignment?: () => ProNurseAssignment | null;
}) {
  const { show: toast } = useToast();
  const router = useRouter();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [selectedServices, setSelectedServices] = useState<SelectedServiceInput[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState(opts.initialPatientId ?? '');
  const [patientMode, setPatientMode] = useState<'existing' | 'new'>(
    opts.initialPatientId ? 'existing' : 'existing',
  );
  const [addressComplement, setAddressComplement] = useState('');
  const [pinnedLookupPatient, setPinnedLookupPatient] = useState<PatientRow | null>(null);

  const form = useForm({
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      gender: '',
      birth_date: '',
      address: null as AddressPayload | null,
    },
  });

  const getProfileId = useCallback(() => {
    if (opts.syncPatientSelfAddress && user?.id) return user.id;
    if (patientMode === 'existing' && selectedPatientId && selectedPatientId !== NEW_PATIENT_ID) {
      return selectedPatientId;
    }
    return null;
  }, [opts.syncPatientSelfAddress, user?.id, patientMode, selectedPatientId]);

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
  >({});
  const [personalFiles, setPersonalFiles] = useState<
    Record<string, DocumentFileRef | undefined>
  >({});

  const isPatientBooking = opts.bookingMode === 'patient' || opts.syncPatientSelfAddress === true;

  const patientsQ = useQuery({
    queryKey: queryKeys.patients.list(),
    queryFn: () => fetchAllPatients(),
    enabled: !isPatientBooking,
  });

  const fillWizardPatient = useCallback(
    async (p: PatientRow) => {
      form.setValue('first_name', p.first_name ?? '');
      form.setValue('last_name', p.last_name ?? '');
      form.setValue('email', p.email ?? '');
      form.setValue('phone', p.phone ?? '');
      form.setValue('gender', normalizePatientGender(p.gender));
      form.setValue('birth_date', (p.birth_date as string) ?? '');
      let full: PatientRow = p;
      try {
        const res = await fetchUser(p.id);
        if (res.success && res.data) full = { ...p, ...(res.data as PatientRow) };
      } catch {
        /* données liste */
      }
      await addressSync.applyFromRaw(full.address);
    },
    [form, addressSync],
  );

  useEffect(() => {
    if (!opts.initialPatientId || !patientsQ.data?.length) return;
    const p = patientsQ.data.find((x) => x.id === opts.initialPatientId);
    if (p) {
      setSelectedPatientId(p.id);
      void fillWizardPatient(p);
    }
  }, [opts.initialPatientId, patientsQ.data, fillWizardPatient]);

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
      }
    },
    [patientsQ.data, fillWizardPatient, pinnedLookupPatient],
  );

  const patientOptions = useMemo(() => {
    const base = (patientsQ.data ?? []).map(patientPickerOptionFromRow);
    if (!pinnedLookupPatient) return base;
    if (base.some((p) => p.id === pinnedLookupPatient.id)) return base;
    return [patientPickerOptionFromRow(pinnedLookupPatient), ...base];
  }, [patientsQ.data, pinnedLookupPatient]);

  const adoptLookupPatient = useCallback(
    (row: PatientRow) => {
      setPinnedLookupPatient(row);
      if (!patientsQ.data?.some((x) => x.id === row.id)) {
        void patientsQ.refetch();
      }
      setPatientMode('existing');
      setSelectedPatientId(row.id);
      void fillWizardPatient(row);
    },
    [fillWizardPatient, patientsQ],
  );

  const nursingCatsQ = useQuery({
    queryKey: queryKeys.categories.list('nursing', 'picker'),
    queryFn: async () => {
      const res = await fetchCareCategories('nursing', 'picker');
      return res.data ?? [];
    },
    staleTime: CACHE_STALE_CATEGORIES_MS,
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

  const allCategories = useMemo((): CareCategory[] => {
    const merged = [...(nursingCatsQ.data ?? []), ...(bloodCatsQ.data ?? [])];
    return isPatientBooking ? filterStaffOnlyCareCategoriesForPatient(merged) : merged;
  }, [nursingCatsQ.data, bloodCatsQ.data, isPatientBooking]);

  const nursingCategories = useMemo(
    () =>
      isPatientBooking
        ? filterStaffOnlyCareCategoriesForPatient(nursingCatsQ.data ?? [])
        : (nursingCatsQ.data ?? []),
    [nursingCatsQ.data, isPatientBooking],
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

  const onlyCategoryOptionsFor = useCallback(
    (cat: CareCategory): boolean => {
      if (isBloodTestAppointment(cat.type)) {
        return selectedServices.some((s) => isBloodTestAppointment(s.type));
      }
      if (isNursingAppointment(cat.type)) {
        return selectedServices.some((s) => isNursingAppointment(s.type));
      }
      return false;
    },
    [selectedServices],
  );

  const [submissionLocked, setSubmissionLocked] = useState(false);

  const submitMut = useMutation({
    mutationFn: async () => {
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
      const formData: Record<string, unknown> = {
        ...patient,
        address,
        formDataByService,
      };

      const err = validateUnifiedRdvPayload(formData, selectedServices, {
        patientEmailOptional: opts.role === 'nurse' || opts.role === 'pro',
      });
      if (err) throw new Error(err.message);

      let patientId =
        selectedPatientId && selectedPatientId !== NEW_PATIENT_ID ? selectedPatientId : undefined;

      if (patientMode === 'new' && !patientId) {
        const lookup = await lookupPatientByContact(patient.email ?? '', patient.phone ?? '');
        if (lookup.success && lookup.data?.id) patientId = lookup.data.id;
      }

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
      }

      if (!patientId) throw new Error('Patient introuvable ou incomplet');

      const genderNorm = normalizePatientGender(patient.gender);
      if (patientMode === 'existing' && patientId) {
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
          await uploadPatientProfileDocument(
            patientId,
            key as PatientProfileUploadType,
            {
              uri: file.uri,
              fileName: file.name,
              mimeType: file.mimeType ?? 'image/jpeg',
            },
          );
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
          patient_booking_consent: true,
          type,
          form_type: typeof p.form_type === 'string' ? p.form_type : type,
        };
      });

      payloads = applyProNurseAssignmentToPayloads(
        payloads,
        opts.getProNurseAssignment?.() ?? null,
      );

      const result = await createMultipleAppointments(payloads);
      if (!result.success) throw new Error(result.error ?? 'Création impossible');
      return result.createdIds[0];
    },
    onSuccess: (id) => {
      if (!id) {
        toast('Rendez-vous créés', { type: 'success' });
        router.replace(`${opts.basePath}/appointments` as never);
        return;
      }
      toast('Rendez-vous créé', { type: 'success' });
      qc.invalidateQueries({ queryKey: queryKeys.appointments.all });
      router.replace(`${opts.basePath}/appointment/${id}` as never);
    },
    onError: (e) => handleApiError(e, toast, 'wizardSubmit'),
  });

  return {
    form,
    selectedServices,
    quickAddService,
    removeService,
    onlyCategoryOptionsFor,
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
    setPatientMode,
    onSelectPatient,
    adoptLookupPatient,
    patientOptions,
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
    ensureCategoryReady,
    saving: submitMut.isPending || submissionLocked,
    submit: useCallback(() => {
      if (submissionLocked || submitMut.isPending) return;
      setSubmissionLocked(true);
      submitMut.mutate(undefined, {
        onSettled: () => setSubmissionLocked(false),
      });
    }, [submitMut, submissionLocked]),
    isNewPatient: patientMode === 'new',
  };
}
