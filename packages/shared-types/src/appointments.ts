/**
 * Types rendez-vous — source: frontend/types/appointments.ts
 */

export type AppointmentType = 'blood_test' | 'nursing';
export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'planned'
  | 'inProgress'
  | 'completed'
  | 'canceled'
  | 'expired'
  | 'refused';
export type GenderType = 'male' | 'female' | 'other';
export type BloodTestType = 'single' | 'multiple';
export type AvailabilityType = 'custom' | 'all_day';
export type FrequencyType =
  | 'once_daily'
  | 'twice_daily'
  | 'thrice_daily'
  | 'twice_weekly'
  | 'thrice_weekly'
  | 'to_define';

export interface Address {
  label: string;
  lat: number;
  lng: number;
}

export interface AvailabilityRange {
  type: AvailabilityType;
  range?: [number, number];
}

export interface AppointmentFormData {
  last_name: string;
  first_name: string;
  birth_date: string;
  phone: string;
  email: string;
  gender: GenderType;
  address: Address | null;
  address_complement?: string;
  category_id: string;
  scheduled_at: string;
  availability: string;
  availability_type: AvailabilityType;
  blood_test_type?: BloodTestType;
  duration_days?: string;
  custom_days?: number;
  frequency?: FrequencyType;
  preferred_nurse_gender?: 'any' | 'female' | 'male';
  notes?: string;
  consent: boolean;
}

export interface Appointment {
  id: string;
  type: AppointmentType;
  status: AppointmentStatus;
  patient_id?: string;
  relative_id?: string;
  assigned_to?: string;
  assigned_nurse_id?: string;
  assigned_lab_id?: string;
  category_id?: string;
  category_name?: string;
  category_image_url?: string | null;
  creation_batch_id?: string | null;
  created_by?: string | null;
  batch_siblings?: Array<{
    id: string;
    status: string;
    scheduled_at: string;
    category_name?: string | null;
  }>;
  blood_test_items?: Array<Record<string, unknown>>;
  blood_test_items_display?: Array<Record<string, unknown>>;
  nursing_items?: Array<Record<string, unknown>>;
  nursing_items_display?: Array<Record<string, unknown>>;
  form_type: AppointmentType;
  address: string;
  form_data?: AppointmentFormData & Record<string, unknown>;
  scheduled_at: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AppointmentListFilters {
  status?: AppointmentStatus | string;
  type?: AppointmentType;
  page?: number;
  limit?: number;
  patient_id?: string;
  nurse_tab?: 'soins' | 'demandes';
  nurse_segment?: string;
  date_from?: string;
  date_to?: string;
}
