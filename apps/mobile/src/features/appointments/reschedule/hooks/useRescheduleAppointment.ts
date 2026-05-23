import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { AVAILABILITY_MIN_SPAN_HOURS } from '@oneandlab/shared-constants';
import type { Appointment } from '@oneandlab/shared-types';
import { queryKeys } from '@/lib/query-keys';
import { useToast } from '@/providers/ToastProvider';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { fetchCareCategories } from '@/features/categories/api/categories.service';
import {
  createAppointment,
  fetchAppointment,
  updateAppointment,
} from '@/features/appointments/api/appointments.service';
import { useAuthStore } from '@/store/auth-store';
import type { AddressPayload } from '../../form/types';
import {
  availabilityMaxHour,
  clampAvailabilityRange,
} from '../../form/utils/booking-availability-utils';
import { isAvailabilityValid } from '../../form/utils/availability';
import {
  buildReschedulePayload,
  type RescheduleChoiceMode,
  type RescheduleFormValues,
} from '../utils/build-reschedule-payload';
import { normalizeRescheduleDate } from '../utils/normalize-reschedule-date';

function parseAddressFromAppointment(apt: Appointment): {
  address: AddressPayload | null;
  complement: string;
} {
  const ext = apt as Appointment & {
    location_lat?: number | string | null;
    location_lng?: number | string | null;
  };
  const fd = (apt.form_data ?? {}) as Record<string, unknown>;
  const lat = ext.location_lat != null ? Number(ext.location_lat) : 0;
  const lng = ext.location_lng != null ? Number(ext.location_lng) : 0;
  const rawAddr = apt.address;

  if (rawAddr != null && String(rawAddr).trim()) {
    try {
      const parsed =
        typeof rawAddr === 'string' && rawAddr.startsWith('{')
          ? (JSON.parse(rawAddr) as AddressPayload)
          : ({ label: String(rawAddr), lat, lng } as AddressPayload);
      return {
        address: parsed,
        complement: String(fd.address_complement ?? parsed.complement ?? ''),
      };
    } catch {
      return {
        address: { label: String(rawAddr), lat, lng },
        complement: String(fd.address_complement ?? ''),
      };
    }
  }

  const fdAddr = fd.address;
  if (fdAddr && typeof fdAddr === 'object' && (fdAddr as AddressPayload).label) {
    const a = fdAddr as AddressPayload;
    return {
      address: {
        label: a.label,
        lat: a.lat != null ? Number(a.lat) : lat,
        lng: a.lng != null ? Number(a.lng) : lng,
      },
      complement: String(fd.address_complement ?? a.complement ?? ''),
    };
  }

  return { address: null, complement: String(fd.address_complement ?? '') };
}

function initialAvailabilityFromAppointment(apt: Appointment): {
  type: 'custom' | 'all_day';
  range: [number, number];
} {
  const fd = (apt.form_data ?? {}) as Record<string, unknown>;
  let type: 'custom' | 'all_day' = 'custom';
  let range: [number, number] = [9, 11];

  if (fd.availability) {
    try {
      const av =
        typeof fd.availability === 'string'
          ? (JSON.parse(fd.availability) as { type?: string; range?: number[] })
          : (fd.availability as { type?: string; range?: number[] });
      if (av.type === 'all_day') {
        type = 'all_day';
      } else if (av.range?.length === 2) {
        range = [av.range[0], av.range[1]];
      }
    } catch {
      /* default */
    }
  } else if (apt.scheduled_at) {
    const h = new Date(apt.scheduled_at).getHours();
    const start = Math.max(6, Math.min(15, h));
    range = [start, start + AVAILABILITY_MIN_SPAN_HOURS];
  }

  const maxHour = availabilityMaxHour(apt.type);
  const [lo, hi] = clampAvailabilityRange(range[0], range[1], maxHour);
  return { type, range: [lo, hi] };
}

export function useRescheduleAppointment(opts: {
  appointmentId: string;
  role: string;
  basePath: string;
}) {
  const { show: toast } = useToast();
  const router = useRouter();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const [step, setStep] = useState<'choice' | 'form'>('choice');
  const [choiceMode, setChoiceMode] = useState<RescheduleChoiceMode | null>(null);
  const [form, setForm] = useState<RescheduleFormValues>({
    category_id: '',
    address: null,
    address_complement: '',
    scheduled_at: '',
    availability_type: 'custom',
    availability_range: [9, 11],
    notes: '',
  });

  const appointmentQ = useQuery({
    queryKey: queryKeys.appointments.detail(opts.appointmentId),
    queryFn: async () => {
      const res = await fetchAppointment(opts.appointmentId);
      return res.data;
    },
    enabled: !!opts.appointmentId,
  });

  const apt = appointmentQ.data;
  const serviceType = apt?.type === 'nursing' ? 'nursing' : 'blood_test';

  const categoriesQ = useQuery({
    queryKey: queryKeys.categories.list(serviceType),
    queryFn: async () => {
      const res = await fetchCareCategories(serviceType);
      return res.data ?? [];
    },
    enabled: step === 'form' && !!apt,
  });

  const initFormFromAppointment = useCallback((a: Appointment) => {
    const fd = (a.form_data ?? {}) as Record<string, unknown>;
    const { address, complement } = parseAddressFromAppointment(a);
    const availability = initialAvailabilityFromAppointment(a);
    setForm({
      category_id: String(fd.category_id ?? a.category_id ?? ''),
      address,
      address_complement: complement,
      scheduled_at: normalizeRescheduleDate(a.scheduled_at),
      availability_type: availability.type,
      availability_range: availability.range,
      notes: String(fd.notes ?? ''),
    });
  }, []);

  useEffect(() => {
    if (step !== 'form' || !apt) return;
    initFormFromAppointment(apt);
  }, [step, apt, initFormFromAppointment]);

  const setField = useCallback(<K extends keyof RescheduleFormValues>(
    key: K,
    value: RescheduleFormValues[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const goToForm = useCallback(() => {
    if (!choiceMode || !apt) return;
    initFormFromAppointment(apt);
    setStep('form');
  }, [choiceMode, apt, initFormFromAppointment]);

  const goBackToChoice = useCallback(() => {
    setStep('choice');
  }, []);

  const submitMut = useMutation({
    mutationFn: async () => {
      if (!apt || !choiceMode) throw new Error('Rendez-vous introuvable');
      if (!form.category_id) throw new Error('Veuillez sélectionner un type de soin.');
      if (!form.scheduled_at?.trim()) throw new Error('La date est obligatoire.');
      if (!form.address?.label?.trim()) throw new Error("L'adresse est obligatoire.");
      if (
        !Number.isFinite(form.address.lat) ||
        !Number.isFinite(form.address.lng) ||
        (form.address.lat === 0 && form.address.lng === 0)
      ) {
        throw new Error('Sélectionnez une adresse dans la liste pour enregistrer la position.');
      }
      if (!isAvailabilityValid(form.availability_type, form.availability_range)) {
        throw new Error('Plage horaire trop courte (minimum 1 h)');
      }

      const labId = (user as { lab_id?: string } | null)?.lab_id ?? null;
      const payload = buildReschedulePayload({
        appointment: apt,
        form,
        role: opts.role,
        userId: user?.id ?? '',
        labId,
      });
      if (!payload) throw new Error('Veuillez remplir la date et l’adresse.');

      if (choiceMode === 'cancel_and_new') {
        const cancelRes = await updateAppointment(apt.id, {
          status: 'canceled',
          cancellation_reason: 'reschedule',
          cancellation_comment: 'Remplacé par un nouveau rendez-vous (reprise).',
        });
        if (!cancelRes.success) {
          throw new Error(cancelRes.error ?? "Impossible d'annuler l'ancien rendez-vous");
        }
      }

      const createRes = await createAppointment(payload);
      if (!createRes.success || !createRes.data?.id) {
        throw new Error(createRes.error ?? 'Impossible de créer le rendez-vous');
      }
      return createRes.data.id;
    },
    onSuccess: (newId) => {
      toast('Rendez-vous créé', { type: 'success' });
      void qc.invalidateQueries({ queryKey: queryKeys.appointments.all });
      void qc.invalidateQueries({ queryKey: queryKeys.appointments.detail(opts.appointmentId) });
      router.replace(`${opts.basePath}/appointment/${newId}` as never);
    },
    onError: (e) => handleApiError(e, toast, 'rescheduleAppointment'),
  });

  const submitLabel = useMemo(() => {
    if (choiceMode === 'cancel_and_new') return "Annuler l'ancien et créer";
    return 'Créer le RDV';
  }, [choiceMode]);

  return {
    step,
    choiceMode,
    setChoiceMode,
    goToForm,
    goBackToChoice,
    form,
    setField,
    appointment: apt,
    categories: categoriesQ.data ?? [],
    loading: appointmentQ.isLoading,
    saving: submitMut.isPending,
    submit: () => submitMut.mutate(),
    submitLabel,
  };
}
