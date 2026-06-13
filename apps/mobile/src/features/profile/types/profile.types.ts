import type { AddressPayload } from '@/features/appointments/form/types';

/** Données profil renvoyées par GET /users/:id */
export interface ProfileUserData {
  id: string;
  email?: string;
  role?: string;
  first_name?: string;
  last_name?: string;
  phone?: string | null;
  gender?: string | null;
  rpps?: string | null;
  adeli?: string | null;
  emploi?: string | null;
  birth_date?: string | null;
  address?: AddressPayload | Record<string, unknown> | string | null;
  profile_image_url?: string | null;
  cover_image_url?: string | null;
  biography?: string | null;
  public_slug?: string | null;
  is_public_profile_enabled?: boolean | number;
  is_accepting_appointments?: boolean | number;
  years_experience?: string | null;
  website_url?: string | null;
  nurse_qualifications?: string[] | null;
  social_links?: {
    facebook?: string;
    linkedin?: string;
    instagram?: string;
  } | null;
  prescription_signature_png?: string | null;
}

export interface NurseCategoryPreference {
  category_id: string;
  name?: string;
  description?: string;
  icon?: string;
  type?: string;
  is_enabled: boolean | number;
}
