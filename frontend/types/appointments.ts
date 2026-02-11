/**
 * Types et interfaces pour les rendez-vous
 */

export type AppointmentType = 'blood_test' | 'nursing';
export type AppointmentStatus = 'pending' | 'confirmed' | 'inProgress' | 'completed' | 'canceled' | 'expired' | 'refused';
export type GenderType = 'male' | 'female' | 'other';
export type BloodTestType = 'single' | 'multiple';
export type AvailabilityType = 'custom' | 'all_day';
export type FrequencyType = 'daily' | 'every_other_day' | 'twice_weekly' | 'thrice_weekly';

export interface Address {
  label: string;
  lat: number;
  lng: number;
}

export interface AvailabilityRange {
  type: AvailabilityType;
  range?: [number, number]; // [startHour, endHour] pour type 'custom'
}

export interface FileMetadata {
  field: string;
  name: string;
  size?: number;
  type?: string;
  medical_document_id?: string;
  isNew: boolean;
}

export interface AppointmentFormData {
  // Informations personnelles
  last_name: string;
  first_name: string;
  birth_date: string;
  phone: string;
  email: string;
  gender: GenderType;
  
  // Adresse
  address: Address | null;
  address_complement?: string;
  
  // Rendez-vous
  category_id: string;
  scheduled_at: string;
  availability: string; // JSON stringified AvailabilityRange
  availability_type: AvailabilityType;
  
  // Spécifique blood_test
  blood_test_type?: BloodTestType;
  duration_days?: string; // '2', '3', '5', '7', '10', '15', 'custom'
  custom_days?: number;
  
  // Spécifique nursing
  frequency?: FrequencyType;
  
  // Documents
  files: Record<string, File>;
  
  // Notes
  notes?: string;
  
  // Consentement
  consent: boolean;
}

export interface AppointmentCreatePayload {
  type: AppointmentType;
  form_type: AppointmentType;
  patient_id?: string;
  relative_id?: string;
  category_id?: string;
  address: Address;
  scheduled_at: string;
  form_data: AppointmentFormData;
  files?: Record<string, File>;
  guest_email?: string;
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
  form_type: AppointmentType;
  address: string;
  form_data?: AppointmentFormData;
  scheduled_at: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AppointmentFilters {
  status?: AppointmentStatus | string;
  type?: AppointmentType;
  page?: number;
  limit?: number;
}


