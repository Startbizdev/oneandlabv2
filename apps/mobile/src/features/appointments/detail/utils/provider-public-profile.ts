import { parseProfileSocialLinks } from '@/features/profile/utils/profile-social-links';
import {
  professionalProfileDisplayName,
  type ProfessionalProfileData,
} from '@/features/profile/utils/professional-profile-sheet';

/** Chemins fiche publique Nuxt (parité web). */
export function providerPublicProfilePath(
  providerType: 'nurse' | 'lab',
  slug: string,
): string {
  const s = slug.trim();
  if (!s) return '';
  return providerType === 'nurse' ? `/infirmier/${s}` : `/Laboratoire/${s}`;
}

export type CreatorOrigin = {
  kind?: 'patient_platform' | 'nurse' | 'pro' | 'lab_team';
  id?: string;
  label?: string;
  display_name?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  profile_image_url?: string;
  public_slug?: string;
  emploi?: string;
  adeli?: string;
  biography?: string | null;
  cover_image_url?: string | null;
  website_url?: string | null;
  social_links?: {
    facebook?: string;
    linkedin?: string;
    instagram?: string;
  } | null;
  role?: string;
};

export function creatorOriginTitle(origin: CreatorOrigin): string {
  switch (origin.kind) {
    case 'patient_platform':
      return 'Origine';
    case 'nurse':
      return 'Rendez-vous pris par';
    case 'pro':
      return 'Professionnel';
    case 'lab_team':
      return 'Équipe laboratoire';
    default:
      return 'Origine';
  }
}

export function creatorOriginName(origin: CreatorOrigin): string {
  if (origin.kind === 'patient_platform') {
    return platformOriginDisplayName(origin.label);
  }
  const parts = [origin.first_name, origin.last_name].filter(Boolean).join(' ').trim();
  return parts || origin.display_name?.trim() || '—';
}

/** Normalise le libellé plateforme (oneandlab → Cary). */
export function platformOriginDisplayName(label?: string | null): string {
  const s = String(label ?? '')
    .trim()
    .replace(/^patient\s+/i, '')
    .trim();
  const compact = s.replace(/\s+/g, '').toLowerCase();
  if (!compact || compact === 'cary' || compact === 'oneandlab' || compact === 'onenandlab') {
    return 'Cary';
  }
  return s;
}

export function isPatientPlatformOrigin(origin?: CreatorOrigin | null): boolean {
  return origin?.kind === 'patient_platform';
}

/** Viewer connecté = créateur du RDV (ne pas afficher sa propre fiche intervenant). */
export function isViewerAppointmentCreator(
  apt: { created_by?: string | null; creator_origin?: CreatorOrigin | null },
  viewerUserId?: string | null,
): boolean {
  if (!viewerUserId) return false;
  const viewerId = String(viewerUserId);
  const createdBy = String(apt.created_by ?? '').trim();
  if (createdBy && createdBy === viewerId) return true;
  const creatorId = String(apt.creator_origin?.id ?? '').trim();
  return Boolean(creatorId && creatorId === viewerId);
}

export type AssigneeProfileSheetState =
  | { kind: 'web'; providerType: 'nurse' | 'lab'; slug: string; title: string }
  | { kind: 'pro'; profile: ProfessionalProfileData; title: string };

export function professionalProfileFromCreatorOrigin(
  origin: CreatorOrigin,
): ProfessionalProfileData | null {
  if (origin.kind !== 'pro') return null;
  const social = parseProfileSocialLinks(origin.social_links ?? undefined);
  const hasSocial = Boolean(social.facebook || social.linkedin || social.instagram);
  return {
    firstName: origin.first_name,
    lastName: origin.last_name,
    displayName: origin.display_name,
    emploi: origin.emploi,
    adeli: origin.adeli,
    biography: origin.biography,
    phone: origin.phone,
    profileImageUrl: origin.profile_image_url,
    coverImageUrl: origin.cover_image_url,
    websiteUrl: origin.website_url,
    socialLinks: hasSocial ? social : null,
  };
}

/** Fiche web publique (infirmier / labo) ou fiche native pro (sans page publique). */
export function resolveCreatorOriginProfileSheet(
  origin: CreatorOrigin,
): AssigneeProfileSheetState | null {
  const profile = professionalProfileFromCreatorOrigin(origin);
  const name = profile
    ? professionalProfileDisplayName(profile)
    : creatorOriginName(origin);
  const slug = origin.public_slug?.trim();
  if (origin.kind === 'nurse' && slug) {
    return { kind: 'web', providerType: 'nurse', slug, title: name };
  }
  if (origin.kind === 'lab_team' && slug) {
    return { kind: 'web', providerType: 'lab', slug, title: name };
  }
  if (origin.kind === 'pro' && profile) {
    return { kind: 'pro', profile, title: name };
  }
  return null;
}

export function creatorOriginSubtitle(origin: CreatorOrigin): string | undefined {
  if (origin.kind === 'patient_platform') {
    return 'Ce rendez-vous a été pris en direct par le patient';
  }
  if (origin.kind === 'pro') {
    return origin.emploi?.trim() || undefined;
  }
  return undefined;
}
