/**
 * Types profil — source: frontend/types/profile.ts
 */

export interface Address {
  label?: string;
  lat?: number;
  lng?: number;
  complement?: string;
}

export interface ProfileForm {
  first_name: string;
  last_name: string;
  email: string;
  email_display?: string | null;
  phone: string | null;
  name: string;
  rpps: string;
  siret: string;
  adeli: string;
  emploi: string | null;
  birth_date: string | null;
  gender: string | null;
  address: Address | null;
  address_complement: string | null;
}

export const GENDER_OPTIONS = [
  { label: 'Homme', value: 'male' },
  { label: 'Femme', value: 'female' },
  { label: 'Autre', value: 'other' },
] as const;

export type DocumentType = 'carte_vitale' | 'carte_mutuelle' | 'autres_assurances';

export interface PatientDocument {
  medical_document_id: string;
  document_type: string;
  file_name: string;
  updated_at: string;
}

export type UserRole =
  | 'super_admin'
  | 'admin'
  | 'lab'
  | 'subaccount'
  | 'nurse'
  | 'preleveur'
  | 'pro'
  | 'patient';

export interface AuthUser {
  id: string;
  email?: string;
  role: UserRole;
  first_name?: string;
  last_name?: string;
  profile_image_url?: string | null;
  avatar?: string | null;
  has_password?: boolean;
  must_change_password?: boolean;
}
