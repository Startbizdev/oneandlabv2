import type { ProfileSocialLinks } from '@/features/profile/utils/profile-social-links';
import { parseProfileSocialLinks } from '@/features/profile/utils/profile-social-links';

export type ProfessionalProfileData = {
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  emploi?: string | null;
  adeli?: string | null;
  biography?: string | null;
  phone?: string | null;
  profileImageUrl?: string | null;
  coverImageUrl?: string | null;
  websiteUrl?: string | null;
  socialLinks?: ProfileSocialLinks | null;
};

export function professionalProfileDisplayName(profile: ProfessionalProfileData): string {
  const parts = [profile.firstName, profile.lastName].filter(Boolean).join(' ').trim();
  return parts || profile.displayName?.trim() || 'Professionnel de santé';
}

export function normalizeExternalUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}
