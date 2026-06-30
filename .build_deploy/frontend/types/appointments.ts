/**
 * Types et interfaces pour les rendez-vous
 */

export type AppointmentType = 'blood_test' | 'nursing';
export type AppointmentStatus = 'pending' | 'confirmed' | 'planned' | 'inProgress' | 'completed' | 'canceled' | 'expired' | 'refused';
export type GenderType = 'male' | 'female' | 'other';
export type BloodTestType = 'single' | 'multiple';
export type AvailabilityType = 'custom' | 'all_day';
export type FrequencyType = 'once_daily' | 'twice_daily' | 'thrice_daily' | 'twice_weekly' | 'thrice_weekly' | 'to_define';

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
  /** Filtre dispatch : any | female | male */
  preferred_nurse_gender?: 'any' | 'female' | 'male';
  
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
  /** Partagé par un lot multi-soins (même type, créé en une fois). */
  creation_batch_id?: string;
  /** Nombre de RDV du lot (envoyé par le client pour regrouper les notifications). */
  creation_batch_size?: number;
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
  /** Image uploadée en admin (`care_categories.image_url`) ; prioritaire sur `category_icon`. */
  category_image_url?: string | null;
  /** Regroupement multi-soins (même lot) */
  creation_batch_id?: string | null;
  /** Autres RDV du même lot (GET détail), sans le courant. */
  batch_siblings?: Array<{
    id: string;
    status: string;
    scheduled_at: string;
    category_name?: string | null;
  }>;
  /** Actes prélèvement sur un même RDV (GET liste / détail). */
  blood_test_items?: Array<Record<string, unknown>>;
  /** Lot legacy multi-RDV prise de sang : actes agrégés (GET détail). */
  blood_test_items_display?: Array<Record<string, unknown>>;
  /** Actes infirmiers sur un même RDV (GET liste / détail). */
  nursing_items?: Array<Record<string, unknown>>;
  /** Lot legacy multi-RDV soins : actes agrégés (GET détail / liste). */
  nursing_items_display?: Array<Record<string, unknown>>;
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
  /** Filtre côté API : rendez-vous d'un patient (pro / infirmier avec accès) */
  patient_id?: string;
  /** Infirmier : `nurse_tab=soins|demandes` (aligné liste RDV) */
  nurse_tab?: 'soins' | 'demandes';
  nurse_segment?: string;
  /** Patient : à venir vs passés (pagination serveur, aligné mobile). */
  patient_period?: 'upcoming' | 'past';
}


