import type { SelectedServiceInput } from '@oneandlab/shared-utils';

export type AddressPayload = {
  label: string;
  lat: number;
  lng: number;
  complement?: string;
  city?: string;
  postal_code?: string;
};

export type LocalFileRef = { uri: string; name: string; mimeType?: string };

export type ServiceFormSlice = {
  scheduled_at: string;
  availability: string;
  blood_test_type?: string;
  duration_days?: string;
  custom_days?: number;
  frequency?: string;
  preferred_nurse_gender?: string;
  notes?: string;
  care_options?: Record<string, unknown>;
  files?: Record<string, LocalFileRef>;
};

export type AppointmentFormValues = {
  patient_id?: string;
  is_new_patient: boolean;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  gender: string;
  birth_date: string;
  address: AddressPayload | null;
  address_complement?: string;
  type: string;
  category_id: string;
  scheduled_at: string;
  availability_type: 'all_day' | 'custom';
  availability_range: [number, number];
  blood_test_type?: string;
  duration_days?: string;
  custom_days?: number;
  frequency?: string;
  preferred_nurse_gender?: string;
  notes?: string;
  care_options?: Record<string, unknown>;
  files: Record<string, LocalFileRef | undefined>;
};

export type WizardFormState = {
  patient_id?: string;
  is_new_patient: boolean;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  gender: string;
  birth_date: string;
  address: AddressPayload | null;
  selectedServices: SelectedServiceInput[];
  formDataByService: Record<string, ServiceFormSlice>;
};

export const NEW_PATIENT_ID = '__new__';
