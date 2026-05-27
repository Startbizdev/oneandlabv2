import { api } from '@/api/client';
import type {
  PublicLabProfile,
  PublicNurseProfile,
} from '@/features/profile/types/public-profile.types';

type PublicProfileResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  redirect?: boolean;
  new_slug?: string;
};

export async function fetchPublicNurseProfile(slug: string): Promise<PublicNurseProfile> {
  const trimmed = slug.trim();
  if (!trimmed) throw new Error('Slug requis');

  const res = await api.get<PublicProfileResponse<PublicNurseProfile>>(
    `/public/nurse/${encodeURIComponent(trimmed)}`,
  );
  if (!res.success || !res.data) {
    throw new Error(res.error ?? 'Profil introuvable');
  }
  return res.data;
}

export async function fetchPublicLabProfile(slug: string): Promise<PublicLabProfile> {
  const trimmed = slug.trim();
  if (!trimmed) throw new Error('Slug requis');

  const res = await api.get<PublicProfileResponse<PublicLabProfile>>(
    `/public/lab/${encodeURIComponent(trimmed)}`,
  );
  if (!res.success) {
    throw new Error(res.error ?? 'Profil introuvable');
  }
  if (res.redirect && res.new_slug?.trim()) {
    return fetchPublicLabProfile(res.new_slug.trim());
  }
  if (!res.data) {
    throw new Error('Profil introuvable');
  }
  return res.data;
}

export async function fetchPublicProviderProfile(
  providerType: 'nurse' | 'lab',
  slug: string,
): Promise<PublicNurseProfile | PublicLabProfile> {
  return providerType === 'nurse'
    ? fetchPublicNurseProfile(slug)
    : fetchPublicLabProfile(slug);
}
