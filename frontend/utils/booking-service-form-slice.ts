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

  return {
    ...def,
    ...categoryDefaults,
    ...params.slice,
    care_options: { ...def.care_options, ...(params.slice.care_options || {}) },
    availabilityRange:
      params.slice.availabilityRange !== undefined
        ? params.slice.availabilityRange
        : def.availabilityRange,
  };
}
