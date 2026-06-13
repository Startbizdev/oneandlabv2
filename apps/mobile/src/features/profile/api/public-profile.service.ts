import { api } from '@/api/client';
import type {
  PublicLabProfile,
  PublicNurseProfile,
} from '@/features/profile/types/public-profile.types';

export async function fetchPublicNurseProfile(slug: string): Promise<PublicNurseProfile> {
  const trimmed = slug.trim();
  if (!trimmed) throw new Error('Slug requis');

  const res = await api.get<PublicNurseProfile>(
    `/public/nurse/${encodeURIComponent(trimmed)}`,
  );
  if (!res.success || !res.data) {
    throw new Error(res.error ?? 'Profil introuvable');
  }
  return res.data;
}

type LabProfileApiResponse = PublicLabProfile & {
  redirect?: boolean;
  new_slug?: string;
};

export async function fetchPublicLabProfile(slug: string): Promise<PublicLabProfile> {
  const trimmed = slug.trim();
  if (!trimmed) throw new Error('Slug requis');

  const res = await api.get<LabProfileApiResponse>(
    `/public/lab/${encodeURIComponent(trimmed)}`,
  );
  if (!res.success) {
    throw new Error(res.error ?? 'Profil introuvable');
  }
  const payload = res.data;
  if (!payload) {
    throw new Error('Profil introuvable');
  }
  if (payload.redirect && payload.new_slug?.trim()) {
    return fetchPublicLabProfile(payload.new_slug.trim());
  }
  return payload;
}

export async function fetchPublicProviderProfile(
  providerType: 'nurse' | 'lab',
  slug: string,
): Promise<PublicNurseProfile | PublicLabProfile> {
  return providerType === 'nurse'
    ? fetchPublicNurseProfile(slug)
    : fetchPublicLabProfile(slug);
}
