/**
 * Types rendez-vous — source: frontend/types/appointments.ts
 */

import type { AppointmentCoNurse } from './nurse-collaborations';

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

/** Proche bénéficiaire d'un RDV ; `profile_id` = son dossier patient (sans connexion). */
export interface AppointmentRelative {
  id?: string;
  first_name?: string;
  last_name?: string;
  email?: string | null;
  phone?: string | null;
  relationship_type?: string;
  birth_date?: string | null;
  contact_is_parent?: boolean;
  profile_id?: string | null;
}

export interface Appointment {
  id: string;
  type: AppointmentType;
  status: AppointmentStatus;
  /** Titulaire du compte : celui qui a réservé, y compris pour un proche. */
  patient_id?: string;
  relative_id?: string;
  relative?: AppointmentRelative | null;
  /** Dossier du proche quand le RDV est pour un proche (`relative.profile_id`). */
  relative_profile_id?: string | null;
  assigned_to?: string;
  assigned_nurse_id?: string;
  assigned_lab_id?: string;
  category_id?: string;
  category_name?: string;
  /** Emoji ou nom d’icône Lucide (`care_categories.icon`). */
  category_icon?: string | null;
  category_image_url?: string | null;
  creation_batch_id?: string | null;
  /** `nurse_passage` : passage créé par un infirmier (série ou passage seul). */
  passage_source?: string | null;
  passage_series_id?: string | null;
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
  /** Jours d’un bilan multi-dates (YYYY-MM-DD), premier jour inclus. */
  visit_dates?: string[] | null;
  started_at?: string;
  completed_at?: string;
  /** Code motif (`CANCELLATION_REASONS`) et commentaire saisis à l'annulation. */
  cancellation_reason?: string | null;
  cancellation_comment?: string | null;
  created_at: string;
  updated_at: string;
  /** Snooze modal offre (appointment_offers.modal_snoozed_until). */
  offer_modal_snoozed_until?: string | null;
  /** Binôme infirmier : confrères ajoutés sur ce RDV (hors titulaire). */
  co_nurses?: AppointmentCoNurse[];
  /** Le lecteur est le confrère invité, pas le titulaire. */
  is_co_nurse?: boolean;
  /** Infirmier titulaire qui a partagé le RDV (renseigné pour l'invité seulement). */
  shared_by_name?: string | null;
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
  /** Préleveur : uniquement les missions assignées (évite la saturation par les offres labo). */
  assigned_only?: boolean;
  /** Préleveur : ses demandes de prélèvement en attente de validation par son labo. */
  preleveur_segment?: 'mes_demandes';
  /** Patient mobile : à venir vs passés (pagination serveur). */
  patient_period?: 'upcoming' | 'past';
}
