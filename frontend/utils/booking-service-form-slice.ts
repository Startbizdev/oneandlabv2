import { isBloodTestAppointment, isNursingAppointment, defaultBookingSliceForCareCategory } from '@oneandlab/shared-utils';
import type { SelectedServiceInput } from '~/utils/dashboard-unified-rdv';

/** Tranche minimale réutilisée avant hydratation par UnifiedAppointmentForm. */
export type BookingServiceFormSlice = {
  blood_test_type?: string;
  duration_days?: string;
  custom_days?: number | null;
  frequency?: string;
  preferred_nurse_gender?: 'any' | 'female' | 'male';
  care_options?: Record<string, string | number>;
  scheduled_at?: string;
  availability?: string;
  availability_type?: string;
  availabilityRange?: [number, number];
  files?: Record<string, File>;
  notes?: string;
  showNotes?: boolean;
};

export function defaultBookingFormSliceForServiceType(serviceType: string): BookingServiceFormSlice {
  const base = isBloodTestAppointment(serviceType)
    ? ({ blood_test_type: 'single' } satisfies BookingServiceFormSlice)
    : ({ duration_days: '1', preferred_nurse_gender: 'any' } satisfies BookingServiceFormSlice);

  return {
    ...base,
    care_options: {},
    scheduled_at: '',
    availability_type: 'all_day',
    availabilityRange: [9, 11],
    files: {},
    notes: '',
    showNotes: false,
  };
}

/**
 * Nouvel acte infirmier alors qu’un autre figure déjà au panier :
 * même lot (fusion API) ⇒ prise en charge, fréquence et préférence infirmière
 * sont forcées depuis le **premier** soin du panier, pas depuis la modal d’addon.
 */
export function formDataSliceForQuickAddedService(params: {
  serviceType: string;
  slice: BookingServiceFormSlice;
  /** Panier avant d’append la ligne `service` */
  priorSelectedServices: SelectedServiceInput[];
  priorFormDataByService?: Record<string, BookingServiceFormSlice | undefined>;
  careCategory?: { name?: string | null; label?: string | null } | null;
}): BookingServiceFormSlice {
  const def = defaultBookingFormSliceForServiceType(params.serviceType);
  const categoryDefaults = params.careCategory
    ? defaultBookingSliceForCareCategory(params.careCategory)
    : {};

  const addonLotNursing =
    isNursingAppointment(params.serviceType) &&
    params.priorSelectedServices.some((s) => isNursingAppointment(s.type));

  let normalizedSlice = { ...params.slice };
  let commonFromLot: Partial<BookingServiceFormSlice> = {};

  if (addonLotNursing && params.priorFormDataByService) {
    const nurses = params.priorSelectedServices.filter((s) => isNursingAppointment(s.type));
    const firstId = nurses[0]?.id;
    const fd = firstId ? params.priorFormDataByService[firstId] : undefined;
    if (fd) {
      commonFromLot = {
        duration_days: fd.duration_days,
        custom_days: fd.custom_days ?? null,
        frequency: fd.frequency ?? '',
        preferred_nurse_gender: fd.preferred_nurse_gender ?? 'any',
      };
    }
    const {
      duration_days: _dur,
      custom_days: _cd,
      frequency: _freq,
      preferred_nurse_gender: _pn,
      ...rest
    } = normalizedSlice;
    normalizedSlice = rest;
  }

  return {
    ...def,
    ...categoryDefaults,
    ...commonFromLot,
    ...normalizedSlice,
    care_options: { ...def.care_options, ...(normalizedSlice.care_options || {}) },
    availabilityRange:
      normalizedSlice.availabilityRange !== undefined
        ? normalizedSlice.availabilityRange
        : def.availabilityRange,
  };
}
