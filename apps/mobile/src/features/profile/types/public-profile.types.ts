import type { ProfileSocialLinks } from '@/features/profile/utils/profile-social-links';

export type PublicProfileReview = {
  id: string;
  rating: number;
  comment?: string | null;
  response?: string | null;
  created_at?: string;
  patient_name?: string;
};

export type PublicProfileReviewStats = {
  average_rating?: number;
  total_reviews?: number;
};

export type PublicProfileSpecialization = {
  id: string | number;
  name: string;
  description?: string | null;
  type?: string;
  icon?: string | null;
  image_url?: string | null;
};

export type PublicProfileQualification = {
  code: string;
  label: string;
};

export type OpeningHoursDay = {
  start?: string;
  end?: string;
};

export type OpeningHoursMap = Record<string, OpeningHoursDay>;

export type PublicProviderProfileBase = {
  id: string;
  slug: string;
  name: string;
  first_name?: string;
  last_name?: string;
  profile_image_url?: string | null;
  cover_image_url?: string | null;
  biography?: string | null;
  address?: string | null;
  city_plain?: string | null;
  map_center?: { lat: number; lng: number } | null;
  website_url?: string | null;
  social_links?: ProfileSocialLinks | null;
  reviews?: {
    stats?: PublicProfileReviewStats;
    items?: PublicProfileReview[];
  };
};

export type PublicNurseProfile = PublicProviderProfileBase & {
  years_experience?: string | null;
  qualifications?: PublicProfileQualification[];
  radius_km?: number | null;
  is_accepting_appointments?: boolean;
  specializations?: PublicProfileSpecialization[];
};

export type PublicLabProfile = PublicProviderProfileBase & {
  opening_hours?: OpeningHoursMap | null;
  services?: PublicProfileSpecialization[];
  min_booking_lead_time_hours?: number;
  accept_rdv_saturday?: boolean;
  accept_rdv_sunday?: boolean;
};

export type PublicProviderProfile = PublicNurseProfile | PublicLabProfile;
