import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { AVAILABILITY_MIN_SPAN_HOURS } from '@oneandlab/shared-constants';
import { enrichScheduledAtWithAvailability } from '@oneandlab/shared-utils';
import type { Appointment } from '@oneandlab/shared-types';
import { queryKeys } from '@/lib/query-keys';
import { useToast } from '@/providers/ToastProvider';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { fetchAppointment, updateAppointment } from '@/features/appointments/api/appointments.service';
import {
  availabilityMaxHour,
  clampAvailabilityRange,
} from '@/features/appointments/form/utils/booking-availability-utils';
import {
  buildAvailabilityPayload,
  isAvailabilityValid,
  type AvailabilityType,
} from '@/features/appointments/form/utils/availability';
import { normalizeRescheduleDate } from '@/features/appointments/reschedule/utils/normalize-reschedule-date';

function initialAvailabilityFromAppointment(apt: Appointment): {
  type: AvailabilityType;
  range: [number, number];
} {
  const fd = (apt.form_data ?? {}) as Record<string, unknown>;
  let type: AvailabilityType = 'custom';
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
        type = 'custom';
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

export function usePatientEditSchedule(appointmentId: string) {
  const { show: toast } = useToast();
  const router = useRouter();
  const qc = useQueryClient();

  const detailQ = useQuery({
    queryKey: queryKeys.appointments.detail(appointmentId),
    queryFn: async () => {
      const res = await fetchAppointment(appointmentId);
      if (!res.success || !res.data) throw new Error(res.error ?? 'RDV introuvable');
      return res.data;
    },
  });

  const apt = detailQ.data;
  const [scheduledAt, setScheduledAt] = useState('');
  const [availabilityType, setAvailabilityType] = useState<AvailabilityType>('custom');
  const [range, setRange] = useState<[number, number]>([9, 11]);

  useEffect(() => {
    if (!apt) return;
    setScheduledAt(normalizeRescheduleDate(apt.scheduled_at));
    const av = initialAvailabilityFromAppointment(apt);
    setAvailabilityType(av.type);
    setRange(av.range);
  }, [apt]);

  const canSubmit = useMemo(
    () => Boolean(scheduledAt) && isAvailabilityValid(availabilityType, range),
    [scheduledAt, availabilityType, range],
  );

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!apt) throw new Error('RDV introuvable');
      const availability = buildAvailabilityPayload(availabilityType, range);
      const scheduled_at = enrichScheduledAtWithAvailability(scheduledAt, availability);
      const form_data = {
        ...(typeof apt.form_data === 'object' && apt.form_data ? apt.form_data : {}),
        availability,
      };
      const res = await updateAppointment(appointmentId, { scheduled_at, form_data });
      if (!res.success) throw new Error(res.error ?? 'Enregistrement impossible');
      return res.data;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: queryKeys.appointments.detail(appointmentId) });
      await qc.invalidateQueries({ queryKey: ['appointments'] });
      toast('Date et créneau mis à jour', { type: 'success' });
      router.back();
    },
    onError: (e) => handleApiError(e, toast, 'patientEditSchedule'),
  });

  const save = useCallback(() => {
    if (!canSubmit) return;
    saveMut.mutate();
  }, [canSubmit, saveMut]);

  return {
    apt,
    loading: detailQ.isPending,
    scheduledAt,
    setScheduledAt,
    availabilityType,
    setAvailabilityType,
    range,
    setRange,
    canSubmit,
    saving: saveMut.isPending,
    save,
  };
}
